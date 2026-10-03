import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { isolatedPostgres, json, literal } from './hosted-storage-postgres-cluster.mjs';
import { HostedVoiceStorage } from '../src/lib/storage/hosted/voice';
import type { HostedVoiceClaim, HostedVoiceResponse, VoiceIdentity } from '../src/lib/storage/hosted/voice-contracts';
import { HostedSessionStorage } from '../src/lib/storage/hosted/session';
import { hashKey, sessionKey, type HostedSnapshot } from '../src/lib/storage/hosted/contracts';
import type { HostedRpc } from '../src/lib/storage/hosted/rpc';
import { createSessionRecord } from '../src/lib/session/create-record';
import { authoredCaseData } from '../src/lib/gameplay/session';
import { TIME_LIMITS } from '../src/lib/game-state';

type Database = Awaited<ReturnType<typeof isolatedPostgres>>;
function adapterRpc(db: Database): HostedRpc {
  return async (name, args) => db.rpc(name, Object.entries(args).map(([key, value]) => {
    assert.match(key, /^p_[a-z_]+$/);
    const sql = value === null ? 'NULL' : typeof value === 'object' ? json(value)
      : typeof value === 'number' ? String(value) : literal(value);
    return `${key} => ${sql}`;
  }));
}
async function fixture(db: Database) {
  const sessionId = randomBytes(24).toString('hex'), caseData = authoredCaseData();
  delete caseData.mode; delete caseData.requiredClues;
  const seed = createSessionRecord({ sessionId, caseData, timerMode: 'unlimited' }, Date.now() - 1_000_000);
  seed.session.status = 'active'; seed.session.startTime = seed.session.createdAt + 1000;
  const snapshot: HostedSnapshot = { ...seed, requests: {}, session: { ...seed.session } };
  const rpc = adapterRpc(db), storage = new HostedVoiceStorage(rpc);
  assert.equal((await new HostedSessionStorage(rpc).create(snapshot)).kind, 'created');
  const request = (requestId: string, kind: VoiceIdentity['kind'] = 'tts') => ({ sessionId, requestId, kind,
    fingerprint: hashKey(`${kind}:${requestId}`), revision: 0, reservation: { deployment: 'voice-fixture',
      units: kind === 'tts' ? 20 : 1024, policy: { sessionCalls: kind === 'tts' ? 256 : 100,
        sessionUnits: kind === 'tts' ? 60_000 : 100 * 3 * 1024 * 1024,
        deploymentCalls: 1000, deploymentUnits: 1_000_000_000, windowSeconds: 3600 } } });
  return { sessionId, key: sessionKey(sessionId), storage, rpc, request };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
function granted(value: Awaited<ReturnType<HostedVoiceStorage['claim']>>): HostedVoiceClaim {
  assert.ok(value.kind === 'claimed' || value.kind === 'recover');
  return value as HostedVoiceClaim;
}
function audio(claim: HostedVoiceClaim, bytes = 1234): HostedVoiceResponse {
  assert.ok(claim.objectKey);
  return { status: 200, contentType: 'audio/mpeg', objectKey: claim.objectKey, bytes, sha256: hashKey('synthetic audio') };
}
async function expire(db: Database, f: Fixture, requestId: string) {
  await db.sql(`UPDATE interrogation_private.voice_requests SET lease_until=clock_timestamp()-interval '1 second'
    WHERE session_key=${literal(f.key)} AND request_key=${literal(hashKey(requestId))};`);
}
const calls = (db: Database, key: string) => db.sql(`SELECT count(*) FROM interrogation_private.work_reservations WHERE session_key=${literal(key)};`);

async function synthesis(db: Database, f: Fixture) {
  const input = f.request('speech-original-001');
  const concurrent = await Promise.all([f.storage.claim(input), f.storage.claim(input)]);
  assert.deepEqual(concurrent.map(item => item.kind).sort(), ['busy', 'claimed']);
  const claim = granted(concurrent.find(item => item.kind === 'claimed')!);
  assert.equal(await calls(db, f.key), '1');
  assert.equal((await f.storage.claim({ ...input, fingerprint: hashKey('changed') })).kind, 'conflict');
  assert.equal((await f.storage.claim({ ...f.request('stale-revision-001'), revision: 1 })).kind, 'stale');
  const response = audio(claim);
  assert.deepEqual(await f.storage.finish(claim, response), { kind: 'committed', response });
  assert.deepEqual(await f.storage.claim(input), { kind: 'replay', response });
  assert.deepEqual(await f.storage.finish(claim, response), { kind: 'replay', response });
  assert.equal((await f.storage.finish(claim, audio(claim, 1235))).kind, 'conflict');
  assert.equal(await db.sql(`SELECT reserved_bytes FROM interrogation_private.voice_requests WHERE session_key=${literal(f.key)};`), String(1234 + 32768));
  await assert.rejects(f.storage.finish(claim, { ...response, objectKey: 'wrong/path.mp3' } as HostedVoiceResponse), /contract validation/);
  await db.sql(`UPDATE interrogation_private.voice_requests SET expires_at=clock_timestamp()-interval '1 second' WHERE session_key=${literal(f.key)};`);
  assert.equal((await f.storage.claim(input)).kind, 'expired');
  assert.equal(await calls(db, f.key), '1');
  console.log('PASS TTS: concurrent claim once; exact replay; changed content/response conflict; stale revision denied; verified metadata shrinks cache reservation; expired receipt never spends again');
}

async function recovery(db: Database, f: Fixture) {
  const input = f.request('speech-recovery-001'), old = granted(await f.storage.claim(input));
  const before = await calls(db, f.key);
  await expire(db, f, input.requestId);
  const recovered = granted(await f.storage.claim(input));
  assert.equal(recovered.kind, 'recover'); assert.ok(recovered.fence > old.fence);
  assert.equal(recovered.objectKey, old.objectKey); assert.equal(await calls(db, f.key), before);
  assert.equal((await f.storage.finish(old, audio(old))).kind, 'stale');
  const error: HostedVoiceResponse = { status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'Stored audio absent; explicit new attempt required.' }) };
  assert.equal((await f.storage.finish(recovered, error)).kind, 'committed');
  assert.deepEqual(await f.storage.claim(input), { kind: 'replay', response: error });
  assert.equal(await db.sql(`SELECT reserved_bytes FROM interrogation_private.voice_requests WHERE session_key=${literal(f.key)}
    AND request_key=${literal(hashKey(input.requestId))};`), '8421376', 'uncertain/error audio keeps possible orphan reservation');
  const stt = f.request('recording-recovery-001', 'stt'), recording = granted(await f.storage.claim(stt));
  await expire(db, f, stt.requestId);
  const used = await calls(db, f.key);
  assert.equal((await f.storage.claim(stt)).kind, 'interrupted');
  assert.equal((await f.storage.claim(stt)).kind, 'interrupted');
  assert.equal((await f.storage.finish(recording, { status: 200, contentType: 'application/json', body: '{"text":"hello"}' })).kind, 'stale');
  assert.equal(await calls(db, f.key), used);
  console.log('PASS voice recovery: TTS changes owner/fence without new work, late writer rejected; unknown audio keeps full cap; interrupted STT permanently refuses provider replay');
}

async function recording(db: Database, f: Fixture) {
  const input = f.request('recording-success-001', 'stt'), claim = granted(await f.storage.claim(input));
  const response: HostedVoiceResponse = { status: 200, contentType: 'application/json', body: '{"text":"A synthetic transcript."}' };
  assert.equal((await f.storage.finish(claim, response)).kind, 'committed');
  assert.deepEqual(await f.storage.claim(input), { kind: 'replay', response });
  const args = { p_session_key: f.key, p_request_key: hashKey(input.requestId), p_kind: 'stt',
    p_fingerprint: input.fingerprint, p_owner: claim.owner, p_fence: claim.fence };
  for (const body of ['not-json', '{"text":""}', JSON.stringify({ text: 'é'.repeat(20_000) })]) {
    assert.equal((await f.rpc('interrogation_voice_finish', { ...args,
      p_response: { status: 200, contentType: 'application/json', body } }) as { kind: string }).kind, 'invalid');
  }
  await db.sql(`UPDATE interrogation_private.game_sessions SET lease_owner=${literal(randomUUID())},lease_until=clock_timestamp()+interval '20 seconds'
    WHERE session_key=${literal(f.key)};`);
  assert.equal((await f.storage.claim(f.request('busy-game-lease-001'))).kind, 'busy');
  await db.sql(`UPDATE interrogation_private.game_sessions SET lease_owner=NULL,lease_until=NULL WHERE session_key=${literal(f.key)};`);
  for (const [difficulty, seconds] of Object.entries(TIME_LIMITS)) {
    const record = { session: { status: 'active', timerMode: 'countdown', startTime: 1000, caseData: { difficulty } } };
    assert.equal(await db.sql(`SELECT interrogation_private.voice_recording_active(${json(record)},to_timestamp(${seconds + 1}));`), 'f');
    assert.equal(await db.sql(`SELECT interrogation_private.voice_recording_active(${json(record)},to_timestamp(${seconds + 0.999}));`), 't');
  }
  console.log('PASS STT: exact JSON transcript replay; malformed/empty/oversize body rejected; active action lease blocks new voice; SQL deadline boundaries match every TS difficulty');
}

async function rollbackAndPrivacy(db: Database, f: Fixture) {
  const before = await calls(db, f.key);
  await db.sql(`CREATE FUNCTION public.fail_voice_insert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'voice insert rollback'; END $$;
    CREATE TRIGGER fail_voice_insert BEFORE INSERT ON interrogation_private.voice_requests FOR EACH ROW EXECUTE FUNCTION public.fail_voice_insert();`);
  await assert.rejects(f.storage.claim(f.request('rollback-voice-001')), /voice insert rollback/);
  assert.equal(await calls(db, f.key), before, 'receipt write failure rolls back both allowances');
  await db.sql('DROP TRIGGER fail_voice_insert ON interrogation_private.voice_requests; DROP FUNCTION public.fail_voice_insert();');
  for (const role of ['anon', 'authenticated', 'service_role']) {
    await assert.rejects(db.sql(`SET ROLE ${role}; SELECT * FROM interrogation_private.voice_requests;`), /permission denied/);
  }
  for (const role of ['anon', 'authenticated']) {
    await assert.rejects(db.rpc('interrogation_voice_claim', Array(13).fill('NULL'), role), /permission denied/);
    await assert.rejects(db.rpc('interrogation_voice_finish', Array(7).fill('NULL'), role), /permission denied/);
  }
  const privileged = await db.sql(`SELECT count(*) FROM pg_proc p,
    LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
    WHERE p.proname IN ('interrogation_voice_claim','interrogation_voice_finish') AND a.grantee=0 AND a.privilege_type='EXECUTE';`);
  assert.equal(privileged, '0');
  console.log('PASS voice transaction/privacy: receipt insert failure rolls back work reservation; anon/authenticated RPC and all direct table access denied');
}

async function limits(db: Database) {
  const f = await fixture(db), claim = granted(await f.storage.claim(f.request('cache-cap-001')));
  await db.sql(`INSERT INTO interrogation_private.voice_requests
    (session_key,request_key,kind,fingerprint,owner,fence,lease_until,created_at,expires_at,reserved_bytes,state)
    SELECT ${literal(f.key)},encode(sha256(convert_to('cap:'||n,'UTF8')),'hex'),'tts',repeat('a',64),gen_random_uuid(),1,
      clock_timestamp()+interval '90 seconds',clock_timestamp(),clock_timestamp()+interval '24 hours',8421376,'pending' FROM generate_series(1,6) n;`);
  assert.equal((await f.storage.claim(f.request('cache-full-001'))).kind, 'limit');
  assert.equal((await f.storage.finish(claim, audio(claim, 100))).kind, 'committed');
  assert.equal((await f.storage.claim(f.request('cache-freed-001'))).kind, 'claimed');
  const count = await fixture(db);
  await db.sql(`INSERT INTO interrogation_private.voice_requests
    (session_key,request_key,kind,fingerprint,owner,fence,lease_until,created_at,expires_at,reserved_bytes,state)
    SELECT ${literal(count.key)},encode(sha256(convert_to('count:'||n,'UTF8')),'hex'),'stt',repeat('b',64),gen_random_uuid(),1,
      clock_timestamp()-interval '2 days',clock_timestamp()-interval '2 days',clock_timestamp()-interval '1 day',32768,'interrupted'
      FROM generate_series(1,256) n;`);
  assert.equal((await count.storage.claim(count.request('receipt-cap-001'))).kind, 'limit');
  assert.equal(await calls(db, count.key), '0');
  console.log('PASS cache bounds: pending TTS reserves maximum; confirmed small object frees cache bytes only; 256 expired tombstones still consume admission slots');
}

async function queuedDeadline(db: Database) {
  const f = await fixture(db), input = f.request('queued-recording-001', 'stt');
  const blocker = db.sql(`SET application_name='voice_budget_blocker'; BEGIN;
    SELECT pg_advisory_xact_lock(hashtextextended('interrogation:work:voice-fixture',0)); SELECT pg_sleep(1.4); COMMIT;`);
  try {
    let held = false;
    for (let attempt = 0; attempt < 20 && !held; attempt++) {
      held = await db.sql("SELECT count(*) FROM pg_stat_activity WHERE application_name='voice_budget_blocker' AND wait_event='PgSleep';") === '1';
      if (!held) await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.ok(held);
    await db.sql(`UPDATE interrogation_private.game_sessions SET record=jsonb_set(jsonb_set(record,'{session,timerMode}','"countdown"'),
      '{session,startTime}',to_jsonb(floor(extract(epoch FROM clock_timestamp())*1000)-299800)) WHERE session_key=${literal(f.key)};`);
    assert.equal((await f.storage.claim(input)).kind, 'stale');
    assert.equal(await calls(db, f.key), '0');
  } finally { await blocker; }
  console.log('PASS queued STT: actual deployment lock wait crosses game deadline; no receipt/provider allowance is consumed');
}

async function main() {
  const db = await isolatedPostgres(), originalFetch = globalThis.fetch;
  let networkCalls = 0;
  globalThis.fetch = async () => { networkCalls++; throw new Error('No network permitted'); };
  try {
    console.log(`Database: ${await db.sql('SHOW server_version;')}`);
    for (const file of ['006_hosted_sessions', '007_hosted_budgets', '009_hosted_claimed_work', '017_hosted_voice']) await db.migrate(`database/migrations/${file}.sql`);
    const f = await fixture(db);
    await synthesis(db, f); await recovery(db, f); await recording(db, f);
    await rollbackAndPrivacy(db, f); await limits(db); await queuedDeadline(db);
    assert.equal(networkCalls, 0);
    console.log('Scope: actual disposable PostgreSQL + TS voice adapters; metadata fixtures only, not audio storage/playback/live ElevenLabs. Provider/network calls: 0.');
  } finally { globalThis.fetch = originalFetch; await db.stop(); console.log('CLEANUP isolated cluster stopped and temporary directory removed'); }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
