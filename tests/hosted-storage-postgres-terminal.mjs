import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { json, literal } from './hosted-storage-postgres-cluster.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const reply = { status: 200, body: { outcome: 'win', score: 1498 } };
function fixture(id) {
  return { version: 1, revision: 0, requests: {}, session: { id, status: 'active', outcome: null,
    caseData: { difficulty: 'easy', setting: 'startup', playMode: 'challenge' },
    createdAt: 1000, lastActivity: 1000, startTime: 1000, endedAt: null, timerMode: 'countdown',
    hintsUsed: 0, accusationsUsed: 0, questionsAsked: 1, currentStress: 2, cluesCollected: 1,
    conversationHistory: [{ role: 'user', content: 'Fixture question' }], acceptedAccusation: null, evaluation: null } };
}
function exportFor(record) {
  const s = record.session;
  return { session_id: s.id, case_data: s.caseData, conversation: s.conversationHistory, outcome: s.outcome,
    difficulty: 'easy', setting: 'startup', accusation_text: s.acceptedAccusation?.text ?? null,
    accusation_correct: s.outcome === 'win', created_at: new Date(s.endedAt).toISOString(),
    stats: { hintsUsed: 0, accusationsUsed: s.accusationsUsed, questionsAsked: 1, maxStress: 2,
      cluesCollected: 1, timeElapsed: 1, difficulty: 'easy', playMode: 'challenge', ranked: true,
      score: 1498, detectiveRating: 'Veteran' } };
}
function client(db, id) {
  const key = hash(id), owner = randomUUID();
  const create = record => db.rpc('interrogation_session_create', [literal(key), json(record)]);
  const load = () => db.rpc('interrogation_session_load', [literal(key)]);
  const receipts = () => db.rpc('interrogation_session_receipts', [literal(key)]);
  const claim = request => db.rpc('interrogation_session_claim',
    [literal(key), literal(hash(request)), literal(hash('terminal-body')), literal(owner), '180']);
  const args = (request, lease, record, exported) => [literal(key), literal(hash(request)), literal(hash('terminal-body')),
    literal(owner), String(lease.fence), String(lease.revision), json(record), json(reply), json(exported)];
  const commit = (request, lease, record, exported = null) => db.rpc('interrogation_action_commit', args(request, lease, record, exported));
  return { key, create, load, receipts, claim, commit, args };
}

export async function terminalScenarios(db) {
  const id = hash('synthetic-atomic-terminal').slice(0, 48);
  const game = client(db, id);
  assert.equal((await game.create(fixture(id))).kind, 'created');
  const action = await game.claim('winning-action');
  const pending = await game.receipts();
  assert.equal(pending.kind, 'loaded');
  assert.equal(pending.requests[hash('winning-action')].state, 'pending');
  assert.ok(pending.requests[hash('winning-action')].startedAt > 0);
  const terminal = structuredClone(action.record);
  Object.assign(terminal.session, { status: 'won', outcome: 'win', endedAt: 2000, accusationsUsed: 1,
    acceptedAccusation: { text: 'Fixture contradiction', explanation: 'Fixture evidence' } });
  const exported = exportFor(terminal);
  const scoreStats = { ...exported.stats };
  delete scoreStats.maxStress; delete scoreStats.cluesCollected;
  terminal.session.winToken = 'a'.repeat(32);
  terminal.token = { issuedAt: 2000, consumed: false, snapshot: { stats: scoreStats,
    caseNumber: 'fixture', caseSetting: 'startup', suspectName: 'Fixture', stressLevel: 2, cluesFound: 1 } };
  assert.equal((await game.commit('winning-action', action, terminal)).kind, 'invalid');
  assert.equal((await game.commit('winning-action', action, terminal, { ...exported, session_id: 'f'.repeat(48) })).kind, 'invalid');
  assert.equal((await game.commit('winning-action', action, terminal, { ...exported, created_at: 'not a date' })).kind, 'invalid');
  assert.equal((await game.commit('winning-action', action, terminal,
    { ...exported, stats: { ...exported.stats, questionsAsked: 99 } })).kind, 'invalid');
  assert.deepEqual((await game.load()).record, action.record, 'invalid export rolls snapshot/receipt back');
  assert.equal((await game.receipts()).requests[hash('winning-action')].state, 'pending');
  await exportFailure(db, game, action, terminal, exported);
  const committed = await game.commit('winning-action', action, terminal, exported);
  assert.equal(committed.kind, 'committed');
  assert.deepEqual((await game.load()).record.token, terminal.token, 'grant commits with terminal snapshot/export');
  const replay = await game.commit('winning-action', action, terminal);
  assert.deepEqual(replay, { kind: 'replay', response: reply });
  const completed = await game.receipts();
  assert.equal(completed.requests[hash('winning-action')].state, 'complete');
  assert.deepEqual(completed.requests[hash('winning-action')].response, reply);
  assert.equal(await db.sql(`SELECT count(*) FROM public.game_exports WHERE session_id=${literal(id)};`), '1');
  const row = JSON.parse(await db.sql(`SELECT to_jsonb(e)-'id' FROM public.game_exports e WHERE session_id=${literal(id)};`));
  assert.deepEqual({ ...row, created_at: new Date(row.created_at).toISOString() }, exported);
  const review = await game.claim('result-read');
  assert.equal((await game.commit('result-read', review, review.record)).kind, 'committed');
  await assert.rejects(db.sql(`UPDATE public.game_exports SET outcome='lose_time' WHERE session_id=${literal(id)};`), /immutable/);
  await assert.rejects(db.sql(`DELETE FROM public.game_exports WHERE session_id=${literal(id)};`), /immutable/);
  await assert.rejects(db.rpc('interrogation_session_complete', game.args('winning-action', action, terminal, null).slice(0, 8)), /permission denied/);
  for (const role of ['anon', 'authenticated']) {
    await assert.rejects(db.rpc('interrogation_action_commit', game.args('winning-action', action, terminal, null), role), /permission denied/);
    await assert.rejects(db.rpc('interrogation_session_receipts', [literal(game.key)], role), /permission denied/);
  }
  await activeScenario(db);
  console.log('PASS terminal export: canonical binding, invalid/insert-failure rollback, exact replay and one immutable export, terminal read recovery, old-complete/private receipt privileges');
}

async function exportFailure(db, game, action, terminal, exported) {
  await db.sql(`CREATE FUNCTION public.fixture_export_failure() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'fixture export failure'; END $$;
    CREATE TRIGGER fixture_export_failure BEFORE INSERT ON public.game_exports
    FOR EACH ROW EXECUTE FUNCTION public.fixture_export_failure();`);
  await assert.rejects(game.commit('winning-action', action, terminal, exported), /fixture export failure/);
  assert.deepEqual((await game.load()).record, action.record);
  assert.equal((await game.receipts()).requests[hash('winning-action')].state, 'pending');
  await db.sql('DROP TRIGGER fixture_export_failure ON public.game_exports; DROP FUNCTION public.fixture_export_failure();');
}
async function activeScenario(db) {
  const id = hash('synthetic-active-no-export').slice(0, 48);
  const game = client(db, id);
  await game.create(fixture(id));
  const action = await game.claim('active-question');
  assert.equal((await game.commit('active-question', action, action.record, {})).kind, 'invalid');
  assert.equal((await game.commit('active-question', action, action.record)).kind, 'committed');
  assert.equal(await db.sql(`SELECT count(*) FROM public.game_exports WHERE session_id=${literal(id)};`), '0');
}
