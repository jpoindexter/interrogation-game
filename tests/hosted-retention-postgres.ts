import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { isolatedPostgres, json, literal } from './hosted-storage-postgres-cluster.mjs';
import { retainHostedPayloads } from '../src/lib/storage/hosted/retention';
import type { HostedRpc } from '../src/lib/storage/hosted/rpc';

type Database = Awaited<ReturnType<typeof isolatedPostgres>>;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const owner = randomUUID();
const tables = ['interrogation_private.game_sessions', 'interrogation_private.game_requests',
  'interrogation_private.read_claims', 'interrogation_private.game_generation_requests',
  'interrogation_private.voice_requests', 'interrogation_private.work_usage',
  'interrogation_private.work_reservations', 'public.game_exports', 'public.leaderboard'];

function adapter(db: Database): HostedRpc {
  return (name, args) => db.rpc(name, Object.entries(args).map(([key, value]) => {
    assert.match(key, /^p_[a-z_]+$/);
    return `${key} => ${typeof value === 'boolean' || typeof value === 'number' ? String(value) : literal(value)}`;
  }));
}
function batch(db: Database, apply = false, limit = 25) {
  return retainHostedPayloads({ apply, limit }, adapter(db));
}
async function snapshot(db: Database, selected = tables) {
  return Promise.all(selected.map(table => db.sql(`SELECT coalesce(jsonb_agg(value ORDER BY value::text),'[]'::jsonb)
    FROM (SELECT to_jsonb(t) value FROM ${table} t) rows;`)));
}
async function session(db: Database, name: string, expired = true) {
  const id = hash(name).slice(0, 48), key = hash(id);
  const record = { version: 1, revision: 0, requests: {}, session: { id, status: 'active', outcome: null,
    conversationHistory: [{ role: 'user', content: 'Synthetic private question' }], winToken: 'a'.repeat(32) } };
  assert.equal((await db.rpc('interrogation_session_create', [literal(key), json(record)])).kind, 'created');
  if (expired) await db.sql(`UPDATE interrogation_private.game_sessions SET expires_at=clock_timestamp()-interval '1 hour'
    WHERE session_key=${literal(key)};`);
  return { id, key, record };
}
async function voice(db: Database, key: string, name: string, kind = 'stt', expired = true) {
  const request = hash(name), fingerprint = hash(`${name}:fingerprint`);
  const response = kind === 'stt'
    ? { status: 200, contentType: 'application/json', body: '{"text":"Synthetic private transcript"}' }
    : { status: 200, contentType: 'audio/mpeg', objectKey: `${key}/tts/${request}.mp3`, bytes: 10, sha256: hash('audio') };
  await db.sql(`INSERT INTO interrogation_private.voice_requests
    (session_key,request_key,kind,fingerprint,owner,fence,lease_until,created_at,expires_at,reserved_bytes,state,response)
    VALUES(${literal(key)},${literal(request)},${literal(kind)},${literal(fingerprint)},${literal(owner)},1,
      clock_timestamp()-interval '1 hour',clock_timestamp()-interval '2 days',
      clock_timestamp()+interval '${expired ? '-1 hour' : '1 day'}',32768,'complete',${json(response)});`);
  return { request, fingerprint, response };
}
async function generation(db: Database, name: string, expired = true) {
  const key = hash(name), fingerprint = hash(`${name}:fingerprint`);
  const claim = await db.rpc('interrogation_generation_claim', [literal(key), literal(fingerprint), literal(owner)]);
  assert.equal(claim.kind, 'claimed');
  await db.sql(`UPDATE interrogation_private.game_generation_requests SET state='complete',
    checkpoint='{"data":{"private":"synthetic generated case"}}',response='{"status":200,"body":{"private":"synthetic response"}}',
    lease_until=clock_timestamp()-interval '1 hour',expires_at=clock_timestamp()+interval '${expired ? '-1 hour' : '1 day'}'
    WHERE request_key=${literal(key)};`);
  return { key, fingerprint };
}
async function seed(db: Database) {
  const expired = await session(db, 'expired'), active = await session(db, 'active', false);
  const terminal = await session(db, 'terminal'), leased = await session(db, 'leased');
  const voiceLeased = await session(db, 'voice-leased');
  const running = await voice(db, voiceLeased.key, 'running-stt');
  await db.sql(`UPDATE interrogation_private.voice_requests SET state='pending',response=NULL,
    lease_until=clock_timestamp()+interval '1 hour' WHERE request_key=${literal(running.request)};`);
  await db.sql(`UPDATE interrogation_private.game_sessions SET lease_owner=${literal(owner)},
    lease_until=clock_timestamp()+interval '1 hour' WHERE session_key=${literal(leased.key)};
    INSERT INTO interrogation_private.game_requests(session_key,request_key,fingerprint,state,fence,response,started_at)
      VALUES(${literal(expired.key)},${literal(hash('action'))},${literal(hash('action-fingerprint'))},
        'complete',1,'{"status":200,"body":{"private":"synthetic action response"}}',clock_timestamp());
    INSERT INTO interrogation_private.read_claims VALUES(${literal(expired.key)},${literal(owner)},1,0);
    INSERT INTO public.game_exports(session_id,case_data,conversation,outcome,difficulty,stats)
      VALUES(${literal(terminal.id)},'{"synthetic":"private case"}','["private synthetic transcript"]','win','easy','{}');
    INSERT INTO public.leaderboard(session_id,redemption_hash,player_name,score,ranked,play_mode)
      VALUES(${literal(terminal.id)},${literal(hash('a'.repeat(32)))},'FIX',100,true,'challenge');`);
  const stt = await voice(db, expired.key, 'expired-stt', 'stt', false);
  const independent = await voice(db, active.key, 'independent-expired-stt');
  await voice(db, active.key, 'active-stt', 'stt', false);
  const tts = await voice(db, expired.key, 'expired-tts', 'tts');
  const gen = await generation(db, 'expired-generation');
  await generation(db, 'active-generation', false);
  const reserve = [literal('retention-fixture'), literal(expired.key), literal(hash('paid-operation')),
    literal(hash('paid-fingerprint')), literal('ai'), '1', '100', '10000', '100', '10000', '3600'];
  assert.equal((await db.rpc('interrogation_reserve_work', reserve, 'fixture_owner')).kind, 'reserved');
  return { expired, active, terminal, leased, stt, independent, tts, gen, reserve };
}
type Fixture = Awaited<ReturnType<typeof seed>>;
async function payloads(db: Database, f: Fixture) {
  const before = await snapshot(db), preview = await batch(db);
  assert.deepEqual(preview, { kind: 'preview', sessions: 1, requests: 1, generations: 1, voices: 2,
    exports: 0, exportsDeferred: 1, sessionsDeferred: 1, voicesDeferred: 1 });
  assert.deepEqual(await snapshot(db), before, 'dry run changes no stored rows');
  assert.deepEqual(await batch(db, true), { ...preview, kind: 'applied' });
  assert.equal(await db.sql(`SELECT record FROM interrogation_private.game_sessions WHERE session_key=${literal(f.expired.key)};`), '{}');
  assert.equal(await db.sql(`SELECT count(*) FROM interrogation_private.game_requests WHERE session_key=${literal(f.expired.key)};`), '0');
  assert.equal(await db.sql(`SELECT count(*) FROM interrogation_private.read_claims WHERE session_key=${literal(f.expired.key)};`), '0');
  assert.equal(await db.sql(`SELECT checkpoint IS NULL AND response IS NULL AND state='interrupted'
    FROM interrogation_private.game_generation_requests WHERE request_key=${literal(f.gen.key)};`), 't');
  assert.equal(await db.sql(`SELECT count(*) FROM interrogation_private.voice_requests
    WHERE kind='stt' AND state='interrupted' AND response IS NULL;`), '2');
  const after = await snapshot(db);
  const rowsExcept = (value: string, key: string, excluded: string[]) =>
    (JSON.parse(value) as Record<string, unknown>[]).filter(row => !excluded.includes(String(row[key])));
  assert.deepEqual(rowsExcept(after[0], 'session_key', [f.expired.key]), rowsExcept(before[0], 'session_key', [f.expired.key]),
    'active sessions, active session/voice leases and export/score sessions remain identical');
  assert.deepEqual(rowsExcept(after[3], 'request_key', [f.gen.key]), rowsExcept(before[3], 'request_key', [f.gen.key]));
  assert.deepEqual(rowsExcept(after[4], 'request_key', [f.stt.request, f.independent.request]),
    rowsExcept(before[4], 'request_key', [f.stt.request, f.independent.request]), 'live voice payload and active voice lease remain identical');
  for (const index of [5, 6, 7, 8]) assert.equal(after[index], before[index], `${tables[index]} retained exactly`);
  const retained = await db.sql(`SELECT response FROM interrogation_private.voice_requests
    WHERE session_key=${literal(f.expired.key)} AND request_key=${literal(f.tts.request)};`);
  assert.deepEqual(JSON.parse(retained), f.tts.response);
  assert.deepEqual(await batch(db, true), { ...preview, kind: 'applied', sessions: 0, requests: 0, generations: 0, voices: 0 });
  console.log('PASS preview/apply: exact dry-run snapshot; session/action/generation/STT payloads erased; repeated apply mutates zero; TTS metadata, exports, scores and paid budgets retained');
}
async function retries(db: Database, f: Fixture) {
  assert.equal((await db.rpc('interrogation_session_create', [literal(f.expired.key), json(f.expired.record)])).kind, 'unavailable');
  assert.equal((await db.rpc('interrogation_action_claim', [literal(f.expired.key), literal(hash('retry-action')),
    literal(hash('body')), literal(owner), literal('retry-action')])).kind, 'unavailable');
  assert.equal((await db.rpc('interrogation_generation_claim', [literal(f.gen.key), literal(f.gen.fingerprint), literal(owner)])).kind, 'expired');
  assert.equal((await db.rpc('interrogation_generation_claim', [literal(f.gen.key), literal(hash('changed')), literal(owner)])).kind, 'conflict');
  const claim = (key: string, request: string, fingerprint: string) => db.rpc('interrogation_voice_claim', [literal(key), literal(request),
    literal('stt'), literal(fingerprint), '0', literal(owner), literal('retention-fixture'), '1', '100', '10000', '100', '10000', '3600']);
  assert.equal((await claim(f.expired.key, f.stt.request, f.stt.fingerprint)).kind, 'unavailable');
  // Valid active recording allows the SQL authority to reach its expired receipt.
  await db.sql(`UPDATE interrogation_private.game_sessions SET record=jsonb_set(record,'{session,timerMode}','"unlimited"')
    WHERE session_key=${literal(f.active.key)};`);
  assert.equal((await claim(f.active.key, f.independent.request, f.independent.fingerprint)).kind, 'expired');
  assert.equal((await db.rpc('interrogation_reserve_work', f.reserve, 'fixture_owner')).kind, 'already_reserved');
  assert.equal((await db.rpc('interrogation_reserve_claimed_work', [...f.reserve, literal(hash('action')),
    literal(hash('action-fingerprint')), literal(owner), '1', '0'])).kind, 'unavailable');
  const score = await db.rpc('interrogation_redeem_win', [literal(f.terminal.key), literal(hash('a'.repeat(32))), literal('FIX')]);
  assert.equal(score.kind, 'replay');
  assert.equal(score.receipt.score, 100);
  const finish = [literal(f.expired.key), literal(f.stt.request), literal('stt'), literal(f.stt.fingerprint), literal(owner), '1', json(f.stt.response)];
  assert.equal((await db.rpc('interrogation_voice_finish', finish)).kind, 'stale');
  console.log('PASS retry authority: expired session/generation/voice IDs cannot claim fresh work; paid reservation replays; late STT finish cannot restore payload; stored score still replays');
}
async function bounded(db: Database) {
  for (let i = 0; i < 3; i++) {
    const f = await session(db, `bounded-${i}`);
    await generation(db, `bounded-generation-${i}`);
    await voice(db, f.key, `bounded-voice-${i}`);
    await db.sql(`INSERT INTO interrogation_private.game_requests(session_key,request_key,fingerprint,state,fence,started_at)
      VALUES(${literal(f.key)},${literal(hash(`bounded-request-${i}`))},${literal(hash('body'))},'pending',1,clock_timestamp());`);
  }
  const first = await batch(db, true, 1);
  for (const field of ['sessions', 'requests', 'generations', 'voices'] as const) assert.equal(first[field], 1);
  const rest = await batch(db, true, 100);
  for (const field of ['sessions', 'requests', 'generations', 'voices'] as const) assert.equal(rest[field], 2);
  for (const args of [['true', '0'], ['false', '101'], ['NULL', '25'], ['true', 'NULL']]) {
    assert.equal((await db.rpc('interrogation_retention_batch', args)).kind, 'invalid');
  }
  console.log('PASS bounds: limit1 applies at most one row per payload entity; subsequent batch drains remainder; invalid/null arguments rejected');
}
async function locking(db: Database) {
  const f = await session(db, 'locked');
  const blocker = db.sql(`SET application_name='retention_blocker'; BEGIN;
    SELECT session_key FROM interrogation_private.game_sessions WHERE session_key=${literal(f.key)} FOR UPDATE;
    SELECT pg_sleep(1.5); COMMIT;`);
  try {
    let held = false;
    for (let i = 0; i < 30 && !held; i++) {
      held = await db.sql("SELECT count(*) FROM pg_stat_activity WHERE application_name='retention_blocker' AND wait_event='PgSleep';") === '1';
      if (!held) await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.ok(held, 'actual lock acquired');
    assert.equal((await batch(db, true)).sessions, 0, 'locked candidate skipped without erasure');
  } finally { await blocker; }
  assert.equal((await batch(db, true)).sessions, 1);
  console.log('PASS concurrency: actual locked expired row skipped; same row erased after lock release; unexpired and active-lease rows remain');
}
async function privacy(db: Database) {
  for (const role of ['anon', 'authenticated']) {
    await assert.rejects(db.rpc('interrogation_retention_batch', ['true', '25'], role), /permission denied/);
  }
  assert.equal(await db.sql(`SELECT count(*) FROM pg_proc p,
    LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
    WHERE p.proname='interrogation_retention_batch' AND a.grantee=0 AND a.privilege_type='EXECUTE';`), '0');
  assert.deepEqual(Object.keys(await batch(db)).sort(), ['kind', 'sessions', 'requests', 'generations', 'voices', 'exports',
    'exportsDeferred', 'sessionsDeferred', 'voicesDeferred'].sort());
  console.log('PASS private contract: anonymous/authenticated execution denied; PUBLIC grant absent; response contains only aggregate counts');
}
async function main() {
  const db = await isolatedPostgres(), originalFetch = globalThis.fetch;
  let networkCalls = 0;
  globalThis.fetch = async () => { networkCalls++; throw new Error('No network permitted'); };
  try {
    console.log(`Runtime: ${process.version}; PostgreSQL: ${await db.sql('SHOW server_version;')}`);
    for (const file of ['001_private_leaderboard', '004_leaderboard_play_mode', '006_hosted_sessions', '007_hosted_budgets',
      '008_hosted_terminal_export', '009_hosted_claimed_work', '010_hosted_redemption', '011_hosted_generation',
      '012_hosted_generation_finish', '013_hosted_endpoint_limits', '014_hosted_reads', '015_hosted_request_identity',
      '016_hosted_export_page', '017_hosted_voice', '018_hosted_retention']) {
      await db.migrate(`database/migrations/${file}.sql`);
    }
    const f = await seed(db);
    await payloads(db, f); await retries(db, f); await bounded(db); await locking(db); await privacy(db);
    assert.equal(networkCalls, 0);
    console.log('Scope: actual disposable PostgreSQL + production retention adapter; synthetic data only. Network/provider/storage calls: 0. No live cleanup, TTS object erasure, export erasure or scheduler claimed.');
  } finally { globalThis.fetch = originalFetch; await db.stop(); console.log('CLEANUP isolated cluster stopped and temporary directory removed'); }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
