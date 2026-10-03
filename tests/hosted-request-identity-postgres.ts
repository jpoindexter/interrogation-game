import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { isolatedPostgres, json, literal } from './hosted-storage-postgres-cluster.mjs';
import { HostedSessionStorage } from '../src/lib/storage/hosted/session';
import { hashKey, sessionKey, type HostedSnapshot } from '../src/lib/storage/hosted/contracts';
import type { HostedRpc } from '../src/lib/storage/hosted/rpc';
import { createSessionRecord } from '../src/lib/session/create-record';
import { authoredCaseData } from '../src/lib/gameplay/session';
import { parseHostedSessionRecord } from '../src/lib/storage/hosted/validate-session';
import { withSessionWorkspace } from '../src/lib/session/workspace';
import { publicSessionStatus } from '../src/lib/session/public-status';

type Database = Awaited<ReturnType<typeof isolatedPostgres>>;
function adapterRpc(database: Database): HostedRpc {
  return async (name, args) => database.rpc(name, Object.entries(args).map(([key, value]) => {
    assert.match(key, /^p_[a-z_]+$/);
    const sql = value === null ? 'NULL' : typeof value === 'object' ? json(value)
      : typeof value === 'number' ? String(value) : literal(value);
    return `${key} => ${sql}`;
  }));
}
async function project(storage: HostedSessionStorage, sessionId: string) {
  const snapshot = await storage.load(sessionId);
  assert.ok(snapshot);
  const record = parseHostedSessionRecord(snapshot);
  record.requests = await storage.receipts(sessionId);
  return withSessionWorkspace({ record }, () => publicSessionStatus(record.session));
}

async function identities(database: Database, storage: HostedSessionStorage, sessionId: string) {
  const requestId = 'question-original-ID_001', fingerprint = hashKey('question body'), owner = randomUUID();
  const claimed = await storage.claim({ sessionId, requestId, fingerprint, owner });
  assert.equal(claimed.kind, 'claimed');
  if (claimed.kind !== 'claimed') throw new Error('Claim required');
  const receipts = await storage.receipts(sessionId);
  assert.equal(receipts[hashKey(requestId)].publicId, requestId);
  assert.equal(receipts[hashKey(requestId)].state, 'pending');
  assert.deepEqual((await project(storage, sessionId)).pendingRequests,
    [{ requestId, startedAt: receipts[hashKey(requestId)].startedAt }]);
  const view = await project(storage, sessionId);
  assert.ok(!JSON.stringify(view).includes(hashKey(requestId)), 'hashed retry key is not a public retry ID');
  assert.ok(!Object.hasOwn(view.caseData, 'the_truth'));
  assert.ok(!Object.hasOwn(view.caseData, 'suspect_true_story'));
  const invalid = await database.rpc('interrogation_action_claim', [literal(sessionKey(sessionId)),
    literal(hashKey('different-request')), literal(fingerprint), literal(owner), literal(requestId)]);
  assert.equal(invalid.kind, 'invalid');
  const response = { status: 200, body: { answered: true, text: 'Synthetic accepted response' } };
  assert.equal((await storage.complete(claimed, claimed.record, response)).kind, 'committed');
  assert.deepEqual(await storage.claim({ sessionId, requestId, fingerprint }), { kind: 'replay', response });
  assert.equal((await storage.claim({ sessionId, requestId, fingerprint: hashKey('changed body') })).kind, 'conflict');
  assert.deepEqual((await storage.receipts(sessionId))[hashKey(requestId)].response, response);
  assert.deepEqual((await project(storage, sessionId)).pendingRequests, []);
  await assert.rejects(database.rpc('interrogation_session_claim', [literal(sessionKey(sessionId)),
    literal(hashKey('old-rpc')), literal(fingerprint), literal(owner)]), /permission denied/);
  console.log('PASS public retry identity: actual adapter claim/receipt/project preserves original ID; hash mismatch denied; exact completed replay; old claim RPC denied');
}

async function privateRead(database: Database, storage: HostedSessionStorage, sessionId: string) {
  const owner = randomUUID(), key = sessionKey(sessionId);
  const claimed = await database.rpc('interrogation_read_claim', [literal(key), literal(owner)]);
  assert.equal(claimed.kind, 'claimed');
  const complete = await database.rpc('interrogation_read_complete', [literal(key), literal(owner),
    String(claimed.revision), String(claimed.fence), json(claimed.record), 'NULL']);
  assert.equal(complete.kind, 'committed');
  assert.equal(Object.keys(await storage.receipts(sessionId)).length, 1, 'read polling creates no persistent user receipt');
  const internalKey = hashKey('interrogation:transient-read:v1');
  await database.sql(`INSERT INTO interrogation_private.game_requests
    (session_key,request_key,fingerprint,state,fence,started_at)
    VALUES(${literal(key)},${literal(internalKey)},${literal(hashKey('internal read'))},'interrupted',1,clock_timestamp());`);
  assert.ok(!Object.hasOwn(await storage.receipts(sessionId), internalKey), 'reserved internal key excluded even if a legacy row remains');
  assert.deepEqual((await project(storage, sessionId)).pendingRequests, []);
  console.log('PASS internal reads: real 014 claim/complete leaves no receipt; seeded legacy internal marker is excluded from receipt/public projections');
}

async function legacyPending(database: Database, storage: HostedSessionStorage, sessionId: string) {
  const requestId = 'legacy-pending-ID_001', fingerprint = hashKey('legacy body'), owner = randomUUID();
  const key = sessionKey(sessionId), hashed = hashKey(requestId);
  await database.rpc('interrogation_session_claim', [literal(key), literal(hashed), literal(fingerprint), literal(owner)], 'fixture_owner');
  assert.equal((await storage.receipts(sessionId))[hashed].publicId, null);
  assert.deepEqual((await project(storage, sessionId)).pendingRequests, [], 'unknown legacy hash is never offered as a usable retry ID');
  assert.equal((await storage.claim({ sessionId, requestId, fingerprint, owner })).kind, 'busy');
  assert.equal((await storage.receipts(sessionId))[hashed].publicId, requestId, 'matching retry backfills original legacy ID');
  assert.equal((await project(storage, sessionId)).pendingRequests[0].requestId, requestId);
  await assert.rejects(database.sql(`UPDATE interrogation_private.game_requests SET public_id='mismatched-public-ID'
    WHERE session_key=${literal(key)} AND request_key=${literal(hashed)};`), /check constraint/);
  console.log('PASS legacy recovery: unknown hashed ID hidden, matching retry restores original ID, database constraint rejects malformed identity binding');
}

async function malformedAdapter(sessionId: string) {
  const key = hashKey('known-request-001');
  for (const publicId of ['not:valid', 'different-valid-ID']) {
    const storage = new HostedSessionStorage(async () => ({ kind: 'loaded', requests: {
      [key]: { hash: hashKey('body'), publicId, state: 'pending', startedAt: 1 },
    } }));
    await assert.rejects(storage.receipts(sessionId), /contract validation failed/);
  }
}

async function main() {
  const database = await isolatedPostgres();
  const originalFetch = globalThis.fetch;
  let providerCalls = 0;
  globalThis.fetch = async () => { providerCalls++; throw new Error('No network permitted'); };
  try {
    console.log(`Database: ${await database.sql('SHOW server_version;')}`);
    for (const file of ['001_private_leaderboard', '004_leaderboard_play_mode', '006_hosted_sessions',
      '008_hosted_terminal_export', '014_hosted_reads', '015_hosted_request_identity']) {
      await database.migrate(`database/migrations/${file}.sql`);
    }
    const sessionId = randomBytes(24).toString('hex'), caseData = authoredCaseData();
    delete caseData.mode; delete caseData.requiredClues;
    const seed = createSessionRecord({ sessionId, caseData });
    const snapshot: HostedSnapshot = { ...seed, session: { ...seed.session }, requests: {} };
    const storage = new HostedSessionStorage(adapterRpc(database));
    assert.equal((await storage.create(snapshot)).kind, 'created');
    await identities(database, storage, sessionId);
    await privateRead(database, storage, sessionId);
    await legacyPending(database, storage, sessionId);
    await malformedAdapter(sessionId);
    assert.equal(providerCalls, 0);
    console.log('PASS malformed adapter receipts rejected; provider/network calls: 0');
    console.log('Scope: disposable PostgreSQL plus actual adapters, domain factory and publicSessionStatus. No live Supabase/HTTP/browser verification.');
  } finally {
    globalThis.fetch = originalFetch;
    await database.stop();
    console.log('CLEANUP isolated cluster stopped and temporary directory removed');
  }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
