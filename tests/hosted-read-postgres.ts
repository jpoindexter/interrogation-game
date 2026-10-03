import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isolatedPostgres, json, literal } from './hosted-storage-postgres-cluster.mjs';
import { createSession, getSessionRecord } from '../src/lib/session/store';
import { authoredCaseData } from '../src/lib/gameplay/session';
import { expireSession } from '../src/lib/session/transitions';
import { publicSessionStatus } from '../src/lib/session/public-status';
import { runHostedSessionRead } from '../src/lib/session/read-request';
import { HostedSessionStorage } from '../src/lib/storage/hosted/session';
import { hashKey } from '../src/lib/storage/hosted/contracts';
import type { HostedRpc } from '../src/lib/storage/hosted/rpc';
import type { GameSession } from '../src/lib/session/types';

type Database = Awaited<ReturnType<typeof isolatedPostgres>>;
function transport(db: Database): HostedRpc {
  return async (name, args) => {
    assert.match(name, /^interrogation_[a-z_]+$/);
    return db.rpc(name, Object.entries(args).map(([key, value]) => {
      assert.match(key, /^p_[a-z_]+$/);
      const encoded = value === null ? 'NULL' : typeof value === 'object' ? json(value)
        : typeof value === 'number' ? String(value) : literal(value);
      return `${key} => ${encoded}`;
    }));
  };
}
async function seed(sessions: HostedSessionStorage, expired = false) {
  process.env.SESSION_STORAGE = 'local'; process.env.VERCEL = '';
  const data = authoredCaseData(); delete data.mode; delete data.requiredClues;
  const id = createSession({ ...data, playMode: 'challenge' });
  const record = structuredClone(getSessionRecord(id)!);
  record.session.status = 'active';
  record.session.startTime = Date.now() - (expired ? 3600000 : 0);
  if (expired) record.session.createdAt = record.session.startTime - 1;
  process.env.SESSION_STORAGE = 'unsupported-fixture'; process.env.VERCEL = '1';
  assert.equal((await sessions.create({ ...record, session: { ...record.session }, requests: {} })).kind, 'created');
  return id;
}
const project = async (session: GameSession) => {
  expireSession(session);
  return { status: 200, body: publicSessionStatus(session) };
};
async function reads(db: Database, sessions: HostedSessionStorage, rpc: HostedRpc) {
  const id = await seed(sessions), p_key = hashKey(id);
  for (let index = 0; index < 3; index++) assert.equal((await runHostedSessionRead(id, project, sessions, rpc)).status, 200);
  assert.equal(await db.sql('SELECT count(*) FROM interrogation_private.game_requests;'), '0');
  assert.equal(await db.sql('SELECT count(*) FROM interrogation_private.read_claims;'), '0');
  const p_owner = randomUUID();
  const claim = await rpc('interrogation_read_claim', { p_key, p_owner }) as { revision: number; fence: number; record: unknown };
  assert.equal((await runHostedSessionRead(id, project, sessions, rpc)).status, 409);
  await db.sql(`UPDATE interrogation_private.game_sessions SET lease_until=clock_timestamp()-interval '1 second' WHERE session_key=${literal(p_key)};`);
  assert.equal((await runHostedSessionRead(id, project, sessions, rpc)).status, 200);
  const late = await rpc('interrogation_read_complete', { p_key, p_owner, p_revision: claim.revision,
    p_fence: claim.fence, p_record: claim.record, p_export: null }) as { kind: string };
  assert.equal(late.kind, 'stale');
  await db.sql(`INSERT INTO interrogation_private.game_requests(session_key,request_key,fingerprint,state,fence,response,started_at)
    SELECT ${literal(p_key)},encode(sha256(convert_to(n::text,'UTF8')),'hex'),repeat('a',64),'complete',1,
    '{"status":200,"body":{}}'::jsonb,clock_timestamp() FROM generate_series(1,500) n;`);
  assert.equal((await runHostedSessionRead(id, project, sessions, rpc)).status, 200, 'full action ledger cannot block status retrieval');
  assert.equal(await db.sql(`SELECT count(*) FROM interrogation_private.game_requests WHERE session_key=${literal(p_key)};`), '500');
  for (const role of ['anon', 'authenticated']) {
    await assert.rejects(db.rpc('interrogation_read_claim', [literal(p_key), literal(randomUUID())], role), /permission denied/);
  }
  console.log('PASS reads: repeated projection leaves zero receipts/markers; full500 actionledger remains readable; active lease and late writer excluded; anonymous claim denied');
}
async function expiry(db: Database, sessions: HostedSessionStorage, rpc: HostedRpc) {
  const id = await seed(sessions, true), p_key = hashKey(id);
  const before = await sessions.load(id);
  await db.sql(`CREATE FUNCTION public.fixture_read_export_failure() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'fixture read export failure'; END $$;
    CREATE TRIGGER fixture_read_export_failure BEFORE INSERT ON public.game_exports
    FOR EACH ROW EXECUTE FUNCTION public.fixture_read_export_failure();`);
  await assert.rejects(runHostedSessionRead(id, project, sessions, rpc), /fixture read export failure/);
  assert.deepEqual(await sessions.load(id), before);
  assert.equal(await db.sql(`SELECT count(*) FROM interrogation_private.game_requests WHERE session_key=${literal(p_key)};`), '0');
  await db.sql('DROP TRIGGER fixture_read_export_failure ON public.game_exports; DROP FUNCTION public.fixture_read_export_failure();');
  await db.sql(`UPDATE interrogation_private.game_sessions SET lease_until=clock_timestamp()-interval '1 second' WHERE session_key=${literal(p_key)};`);
  const result = await runHostedSessionRead(id, project, sessions, rpc);
  assert.equal(result.status, 200); assert.equal(result.body.outcome, 'lose_time');
  assert.ok(result.body.result, 'canonical result persists on first timeout projection');
  const again = await runHostedSessionRead(id, project, sessions, rpc);
  assert.deepEqual(again.body.result, result.body.result);
  assert.equal(await db.sql(`SELECT count(*) FROM public.game_exports WHERE session_id=${literal(id)};`), '1');
  assert.equal(await db.sql(`SELECT count(*) FROM interrogation_private.game_requests WHERE session_key=${literal(p_key)};`), '0');
  console.log('PASS timeout read: canonical expiry/result/export atomic; forced export failure rolls back and leaves no action receipt; recovered repeat retains one export');
}
async function main() {
  const db = await isolatedPostgres(), directory = await mkdtemp(join(tmpdir(), 'hosted-read-seed-'));
  try {
    process.env.INTERROGATION_DATA_DIR = directory;
    for (const file of ['001_private_leaderboard', '004_leaderboard_play_mode', '006_hosted_sessions', '008_hosted_terminal_export', '014_hosted_reads', '015_hosted_request_identity']) {
      await db.migrate(`database/migrations/${file}.sql`);
    }
    console.log(`Database: ${await db.sql('SHOW server_version;')}`);
    const rpc = transport(db), sessions = new HostedSessionStorage(rpc);
    await reads(db, sessions, rpc); await expiry(db, sessions, rpc);
    console.log('Scope: actual domain projections/TS read orchestration and PostgreSQL. No live Supabase/PostgREST, public HTTP route, browser, provider, voice or deployment.');
  } finally { await db.stop(); await rm(directory, { recursive: true, force: true }); console.log('CLEANUP isolated database and seed directory removed'); }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
