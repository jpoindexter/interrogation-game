import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { json, literal } from './hosted-storage-postgres-cluster.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const response = { status: 200, body: { answer: 'Fixture answer', accepted: true } };
function fixture(id) {
  return { version: 1, revision: 0, requests: {}, session: { id, status: 'active', outcome: null,
    questionsAsked: 0, conversationHistory: [], lastActivity: 0, evaluation: null } };
}
function client(db, id) {
  const key = hash(id);
  const owner = randomUUID();
  const create = record => db.rpc('interrogation_session_create', [literal(key), json(record)]);
  const load = () => db.rpc('interrogation_session_load', [literal(key)]);
  const claim = (request, fingerprint = 'body', lease = 180, claimant = owner) => db.rpc('interrogation_session_claim',
    [literal(key), literal(hash(request)), literal(hash(fingerprint)), literal(claimant), String(lease)]);
  const complete = (request, receipt, record = receipt.record, reply = response, claimant = owner) =>
    db.rpc('interrogation_session_complete', [literal(key), literal(hash(request)), literal(hash('body')),
      literal(claimant), String(receipt.fence), String(receipt.revision), json(record), json(reply)]);
  return { key, owner, create, load, claim, complete };
}

export async function sessionScenarios(db) {
  const id = hash('synthetic-session-acceptance').slice(0, 48);
  const session = client(db, id);
  const original = fixture(id);
  const creates = await Promise.all([session.create(original), session.create(original)]);
  assert.deepEqual(creates.map(result => result.kind).sort(), ['created', 'exists']);
  assert.equal((await session.create({ ...original, extra: true })).kind, 'conflict');
  assert.equal((await session.create(null)).kind, 'invalid');
  assert.equal((await db.rpc('interrogation_session_load', ['NULL'])).kind, 'invalid');
  const loaded = await session.load();
  assert.equal(loaded.kind, 'loaded');
  assert.ok(loaded.record.session.lastActivity > 0, 'database owns activity clock');
  const claims = await Promise.all([session.claim('question'), session.claim('question')]);
  assert.deepEqual(claims.map(result => result.kind).sort(), ['busy', 'claimed']);
  const claim = claims.find(result => result.kind === 'claimed');
  assert.equal((await session.claim('question', 'changed body')).kind, 'conflict');
  assert.equal((await session.claim('other question')).kind, 'busy');
  const stale = { ...claim, revision: claim.revision + 1 };
  assert.equal((await session.complete('question', stale, { ...claim.record, revision: stale.revision })).kind, 'stale');
  assert.equal((await session.complete('question', claim, claim.record, response, randomUUID())).kind, 'stale');
  const next = structuredClone(claim.record);
  next.session.questionsAsked = 1;
  next.session.conversationHistory.push({ role: 'user', content: 'Fixture question' });
  const changedFacts = structuredClone(next);
  changedFacts.session.caseData = { invented: true };
  assert.equal((await session.complete('question', claim, changedFacts)).kind, 'conflict');
  await sessionRollback(db, session, claim, next);
  const committed = await session.complete('question', claim, next);
  assert.equal(committed.kind, 'committed');
  assert.equal(committed.record.revision, 1);
  assert.deepEqual((await session.load()).record, committed.record);
  assert.deepEqual((await session.claim('question')).response, response);
  const replay = await session.complete('question', claim, next, { status: 409, body: { changed: true } });
  assert.equal(replay.kind, 'replay');
  assert.deepEqual(replay.response, response);
  assert.deepEqual((await session.create(original)).record, committed.record, 'lost create response cannot reset progress');
  console.log('PASS sessions: concurrent create/claim once; load; busy/conflict; owner/revision fences; exact response replay without reset');
  await leaseAndTerminal(db, session);
  await expiry(db);
}

async function sessionRollback(db, session, claim, next) {
  await db.sql(`CREATE FUNCTION public.fixture_fail_completion() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.state='complete' THEN RAISE EXCEPTION 'fixture rollback'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER fixture_fail_completion BEFORE UPDATE ON interrogation_private.game_requests
    FOR EACH ROW EXECUTE FUNCTION public.fixture_fail_completion();`);
  await assert.rejects(session.complete('question', claim, next), /fixture rollback/);
  assert.deepEqual((await session.load()).record, claim.record, 'session update rolls back with receipt failure');
  assert.equal(await db.sql(`SELECT state FROM interrogation_private.game_requests WHERE session_key=${literal(session.key)};`), 'pending');
  await db.sql('DROP TRIGGER fixture_fail_completion ON interrogation_private.game_requests; DROP FUNCTION public.fixture_fail_completion();');
  console.log('PASS session transaction rollback: forced receipt-write failure preserves old record and pending request');
}

async function leaseAndTerminal(db, session) {
  const abandoned = await session.claim('abandoned', 'body', 1);
  assert.equal(abandoned.kind, 'claimed');
  await db.sql('SELECT pg_sleep(1.1);');
  assert.equal((await session.claim('abandoned')).kind, 'interrupted', 'expired pending is never reauthorized');
  const replacement = await session.claim('replacement');
  assert.equal(replacement.kind, 'claimed');
  assert.ok(replacement.fence > abandoned.fence);
  assert.equal((await session.complete('abandoned', abandoned)).kind, 'stale');
  const terminal = structuredClone(replacement.record);
  terminal.session.status = 'won'; terminal.session.outcome = 'win';
  terminal.session.evaluation = { score: 1200, explanation: 'Fixture verdict' };
  assert.equal((await session.complete('replacement', replacement, terminal)).kind, 'committed');
  const terminalClaim = await session.claim('terminal read');
  const reopened = structuredClone(terminalClaim.record);
  reopened.session.status = 'active'; reopened.session.outcome = null;
  assert.equal((await session.complete('terminal read', terminalClaim, reopened)).kind, 'conflict');
  const altered = structuredClone(terminalClaim.record);
  altered.session.evaluation.score = 9999;
  assert.equal((await session.complete('terminal read', terminalClaim, altered)).kind, 'conflict');
  assert.equal((await session.complete('terminal read', terminalClaim, { ...terminalClaim.record, token: { consumed: true } })).kind, 'conflict');
  assert.equal((await session.complete('terminal read', terminalClaim)).kind, 'committed');
  assert.equal((await session.load()).record.session.evaluation.score, 1200);
  console.log('PASS leases/terminal state: real deadline expiry interrupts old ID; new fence rejects late writer; outcome/evaluation/token immutable');
}

async function expiry(db) {
  const id = hash('synthetic-expired-session').slice(0, 48);
  const session = client(db, id);
  const record = fixture(id);
  assert.equal((await session.create(record)).kind, 'created');
  const claimed = await session.claim('expired work');
  await db.sql(`UPDATE interrogation_private.game_sessions SET expires_at=clock_timestamp()-interval '1 second'
    WHERE session_key=${literal(session.key)};`);
  assert.equal((await session.load()).kind, 'unavailable');
  assert.equal((await session.create(record)).kind, 'unavailable');
  assert.equal((await session.claim('expired work')).kind, 'unavailable');
  assert.equal((await session.complete('expired work', claimed)).kind, 'unavailable');
  console.log('PASS expired session: load/create/claim/complete refuse resurrection');
}
