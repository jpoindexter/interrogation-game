import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { HostedAudioRetention } from '../src/lib/storage/hosted/audio-retention';
import { cleanHostedAudio } from '../src/lib/voice/hosted-audio-cleanup';
import type { HostedRpc } from '../src/lib/storage/hosted/rpc';
import { isolatedPostgres, json, literal } from './hosted-storage-postgres-cluster.mjs';

type Database = Awaited<ReturnType<typeof isolatedPostgres>>;
type Receipt = { key: string; request: string; fingerprint: string; args: string[]; response: object };
type Job = { id: string; bucket: string; objectKey: string; fence: number; leaseUntil: number };
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const owner = randomUUID(), bucket = 'fixture-audio';
const tables = ['voice_requests', 'audio_deletion_jobs', 'work_usage', 'work_reservations'];
const preview = async (db: Database, limit = 25) => ({ kind: 'preview', ...await new HostedAudioRetention(adapter(db)).preview(limit) });
const claim = (db: Database, who = owner, limit = 25) => db.rpc('interrogation_audio_retention_claim', [literal(who), String(limit)]);
const finish = (db: Database, job: Job, who = owner) => db.rpc('interrogation_audio_retention_finish',
  [literal(job.id), literal(who), String(job.fence)]);
function adapter(db: Database): HostedRpc {
  return (name, args) => db.rpc(name, Object.entries(args).map(([key, value]) => {
    assert.match(key, /^p_[a-z_]+$/);
    return `${key} => ${value === null ? 'NULL' : typeof value === 'number' ? String(value) : literal(value)}`;
  }));
}
async function snapshot(db: Database, selected = tables) {
  return Promise.all(selected.map(table => db.sql(`SELECT coalesce(jsonb_agg(row ORDER BY row::text),'[]')
    FROM (SELECT to_jsonb(t) row FROM interrogation_private.${table} t) rows;`)));
}
async function fixture(db: Database, name: string, legacy = false): Promise<Receipt> {
  const id = hash(name).slice(0, 48), key = hash(id), request = hash(name), fingerprint = hash(`${name}:body`);
  const record = { version: 1, revision: 0, requests: {}, session: { id,
    status: 'active', outcome: null, timerMode: 'unlimited' } };
  assert.equal((await db.rpc('interrogation_session_create', [literal(key), json(record)])).kind, 'created');
  const args = [literal(key), literal(request), "'tts'", literal(fingerprint), '0', literal(owner),
    "'audio-retention-fixture'", '1', '100', '10000', '1000', '100000', '3600'];
  const result = await db.rpc(legacy ? 'interrogation_voice_claim' : 'interrogation_voice_claim_in_bucket',
    legacy ? args : [...args, literal(bucket)], legacy ? 'fixture_owner' : 'service_role');
  assert.equal(result.kind, 'claimed');
  const response = { status: 200, contentType: 'audio/mpeg', objectKey: `${key}/tts/${request}.mp3`,
    bytes: 10, sha256: hash('synthetic audio') };
  assert.equal((await db.rpc('interrogation_voice_finish', [literal(key), literal(request), "'tts'",
    literal(fingerprint), literal(owner), '1', json(response)])).kind, 'committed');
  return { key, request, fingerprint, args, response };
}
async function age(db: Database, receipt: Receipt, lease = '-1 hour', expiry = '-1 hour') {
  await db.sql(`UPDATE interrogation_private.voice_requests SET lease_until=clock_timestamp()+interval ${literal(lease)},
    expires_at=clock_timestamp()+interval ${literal(expiry)} WHERE session_key=${literal(receipt.key)};`);
}
async function provenance(db: Database) {
  const current = await fixture(db, 'first-binding'), legacy = await fixture(db, 'legacy', true);
  assert.equal(await db.sql(`SELECT audio_bucket FROM interrogation_private.voice_requests
    WHERE session_key=${literal(current.key)};`), bucket);
  assert.equal((await db.rpc('interrogation_voice_claim_in_bucket', [...current.args, literal(bucket)])).kind, 'replay');
  for (const receipt of [current, legacy]) {
    assert.equal((await db.rpc('interrogation_voice_claim_in_bucket', [...receipt.args, "'changed-bucket'"])).kind, 'conflict');
  }
  assert.equal((await db.rpc('interrogation_voice_claim_in_bucket', [...legacy.args, literal(bucket)])).kind, 'conflict');
  await assert.rejects(db.sql(`UPDATE interrogation_private.voice_requests SET audio_bucket='changed-bucket'
    WHERE session_key=${literal(current.key)};`), /audio bucket is immutable/);
  for (const value of ['NULL', "'UPPERCASE'", "'ab'", "'bad/path'", "'has_underscore'"]) {
    assert.equal((await db.rpc('interrogation_voice_claim_in_bucket', [...current.args, value])).kind, 'invalid');
  }
  const stt = [...current.args]; stt[1] = literal(hash('stt')); stt[2] = "'stt'";
  assert.equal((await db.rpc('interrogation_voice_claim_in_bucket', [...stt, literal(bucket)])).kind, 'invalid');
  assert.equal((await db.rpc('interrogation_voice_claim_in_bucket', [...stt, 'NULL'])).kind, 'claimed');
  const before = await snapshot(db);
  await db.sql(`CREATE FUNCTION public.fail_audio_binding() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.audio_bucket IS NOT NULL THEN RAISE EXCEPTION 'binding rollback'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER fail_audio_binding BEFORE UPDATE ON interrogation_private.voice_requests
    FOR EACH ROW EXECUTE FUNCTION public.fail_audio_binding();`);
  const rollback = [...current.args]; rollback[1] = literal(hash('rollback'));
  await assert.rejects(db.rpc('interrogation_voice_claim_in_bucket', [...rollback, literal(bucket)]), /binding rollback/);
  assert.deepEqual(await snapshot(db), before, 'binding failure rolls back receipt and both allowances');
  await db.sql('DROP TRIGGER fail_audio_binding ON interrogation_private.voice_requests; DROP FUNCTION public.fail_audio_binding();');
  await age(db, legacy);
  console.log('PASS provenance: first-claim bucket persisted atomically; exact replay; mismatched/legacy buckets rejected; immutable binding; STT null; invalid names; binding failure rolls back allowances');
}
async function boundaries(db: Database) {
  const eligible = await fixture(db, 'expired'), live = await fixture(db, 'unexpired');
  const leased = await fixture(db, 'voice-leased'), grace = await fixture(db, 'grace');
  const parent = await fixture(db, 'parent-expired'), parentLease = await fixture(db, 'parent-leased');
  await age(db, eligible); await age(db, live, '-1 hour', '1 hour');
  await age(db, leased, '1 hour'); await age(db, grace, '-4 minutes');
  await db.sql(`UPDATE interrogation_private.voice_requests SET state='pending',response=NULL WHERE session_key=${literal(eligible.key)};`);
  await age(db, parent, '-1 hour', '1 hour'); await age(db, parentLease);
  await db.sql(`UPDATE interrogation_private.game_sessions SET expires_at=clock_timestamp()-interval '1 hour'
    WHERE session_key=${literal(parent.key)};
    UPDATE interrogation_private.game_sessions SET lease_owner=${literal(owner)},lease_until=clock_timestamp()+interval '1 hour'
    WHERE session_key=${literal(parentLease.key)};`);
  const before = await snapshot(db);
  assert.deepEqual(await preview(db), { kind: 'preview', eligible: 2, deferred: 1 });
  assert.deepEqual(await snapshot(db), before, 'preview changes no rows');
  const result = await claim(db);
  assert.equal(result.jobs.length, 2); assert.equal(result.deferred, 1);
  assert.deepEqual(result.jobs.map((job: Job) => job.objectKey).sort(),
    [eligible, parent].map(r => `${r.key}/tts/${r.request}.mp3`).sort());
  for (const job of result.jobs as Job[]) {
    assert.deepEqual(Object.keys(job).sort(), ['bucket', 'fence', 'id', 'leaseUntil', 'objectKey']);
    assert.equal(job.bucket, bucket); assert.equal((await finish(db, job)).kind, 'deleted');
  }
  for (const receipt of [eligible, parent]) {
    assert.equal(await db.sql(`SELECT state='interrupted' AND response IS NULL AND expires_at<=clock_timestamp()
      FROM interrogation_private.voice_requests WHERE session_key=${literal(receipt.key)};`), 't');
    assert.equal((await db.rpc('interrogation_voice_finish', [literal(receipt.key), literal(receipt.request), "'tts'",
      literal(receipt.fingerprint), literal(owner), '1', json(receipt.response)])).kind, 'expired');
    assert.ok(['expired', 'unavailable'].includes((await db.rpc('interrogation_voice_claim_in_bucket',
      [...receipt.args, literal(bucket)])).kind));
  }
  const after = await snapshot(db), changedKeys = [eligible.key, parent.key];
  const unchanged = (rows: string) => JSON.parse(rows).filter((row: { session_key: string }) => !changedKeys.includes(row.session_key));
  assert.deepEqual(unchanged(after[0]), unchanged(before[0]), 'live/grace/parent lease/legacy/STT rows unchanged');
  assert.deepEqual(after.slice(2), before.slice(2), 'all budget counters and reservations unchanged');
  await age(db, grace, '-5 minutes');
  assert.equal((await claim(db, owner, 1)).jobs.length, 1, 'at least five minutes after lease expiry becomes eligible');
  console.log('PASS eligibility: receipt or parent expiry; live receipt/voice lease/parent lease skipped; five-minute grace boundary; preview unchanged; no payload restoration or new paid claim; budgets unchanged');
}
async function raceAndRecovery(db: Database) {
  const receipt = await fixture(db, 'claim-race'); await age(db, receipt);
  const owners = [randomUUID(), randomUUID()];
  const results = await Promise.all(owners.map(who => claim(db, who, 1)));
  assert.deepEqual(results.map(result => result.jobs.length).sort(), [0, 1]);
  const winning = results.findIndex(result => result.jobs.length === 1), job: Job = results[winning].jobs[0];
  assert.equal((await finish(db, job, owners[1 - winning])).kind, 'stale');
  assert.equal((await finish(db, { ...job, fence: job.fence + 1 }, owners[winning])).kind, 'stale');
  assert.equal((await claim(db)).jobs.length, 0, 'uncertain worker retains exclusive cleanup lease');
  await db.sql(`UPDATE interrogation_private.audio_deletion_jobs SET lease_until=clock_timestamp()-interval '1 second'
    WHERE id=${literal(job.id)};`);
  assert.equal((await finish(db, job, owners[winning])).kind, 'stale', 'expired fence cannot finish');
  const retried: Job = (await claim(db)).jobs[0];
  assert.equal(retried.id, job.id); assert.equal(retried.bucket, job.bucket); assert.equal(retried.objectKey, job.objectKey);
  assert.equal(retried.fence, job.fence + 1);
  assert.equal((await finish(db, job, owners[winning])).kind, 'stale');
  assert.equal((await finish(db, retried)).kind, 'deleted');
  assert.equal((await finish(db, retried)).kind, 'replay', 'uncertain finish can safely replay');
  assert.equal((await claim(db)).jobs.length, 0, 'confirmed deletion tombstone never reclaims');
  assert.equal(await db.sql(`SELECT count(*) FROM interrogation_private.voice_requests WHERE session_key=${literal(receipt.key)};`), '1');
  console.log('PASS jobs: concurrent claim once; active cleanup lease exclusive; expired/mismatched owner/fence rejected; uncertain removal retries same job/bucket/key with higher fence; confirmed finish replays; tombstones retained');
}
async function lockedAndBounded(db: Database) {
  const receipt = await fixture(db, 'locked-candidate'); await age(db, receipt);
  const blocker = db.sql(`SET application_name='audio_retention_blocker'; BEGIN;
    SELECT session_key FROM interrogation_private.game_sessions WHERE session_key=${literal(receipt.key)} FOR UPDATE;
    SELECT pg_sleep(1.2); COMMIT;`);
  try {
    let held = false;
    for (let attempt = 0; attempt < 30 && !held; attempt++) {
      held = await db.sql("SELECT count(*) FROM pg_stat_activity WHERE application_name='audio_retention_blocker' AND wait_event='PgSleep';") === '1';
      if (!held) await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.ok(held); assert.equal((await claim(db)).jobs.length, 0, 'locked candidate skipped');
  } finally { await blocker; }
  const extra = await fixture(db, 'bounded-candidate'); await age(db, extra);
  assert.equal((await claim(db, owner, 1)).jobs.length, 1);
  assert.equal((await claim(db, owner, 100)).jobs.length, 1);
  for (const limit of ['0', '101', 'NULL']) {
    assert.equal((await db.rpc('interrogation_audio_retention_preview', [limit])).kind, 'invalid');
    assert.equal((await db.rpc('interrogation_audio_retention_claim', [literal(owner), limit])).kind, 'invalid');
  }
  assert.equal((await db.rpc('interrogation_audio_retention_claim', ['NULL', '25'])).kind, 'invalid');
  assert.equal((await db.rpc('interrogation_audio_retention_finish', ['NULL', 'NULL', 'NULL'])).kind, 'invalid');
  console.log('PASS locking/bounds: actual parent row lock skipped; available rows bounded at 1 and 100; null/out-of-range arguments rejected');
}
async function workerRecovery(db: Database) {
  const receipt = await fixture(db, 'worker-recovery'); await age(db, receipt);
  const budgets = await snapshot(db, ['work_usage', 'work_reservations']);
  const rpc = adapter(db); let finishCalls = 0, eraseCalls = 0, objectPresent = true;
  const erase = async (storedBucket: string, key: string, signal?: AbortSignal) => {
    assert.equal(storedBucket, bucket); assert.equal(key, `${receipt.key}/tts/${receipt.request}.mp3`);
    assert.ok(signal && !signal.aborted); eraseCalls++;
    if (eraseCalls === 2) assert.equal(objectPresent, false, 'retry observes already absent object');
    objectPresent = false;
  };
  const interrupted = new HostedAudioRetention(async (name, args) => {
    if (name === 'interrogation_audio_retention_finish') { finishCalls++; throw new Error('Completion transport interrupted before SQL commit'); }
    return rpc(name, args);
  });
  const result = await cleanHostedAudio({ apply: true, limit: 1 }, { receipts: interrupted, erase });
  assert.deepEqual(result, { kind: 'applied', claimed: 1, deleted: 0, pending: 1, deferred: 1 });
  assert.equal(finishCalls, 1); assert.equal(eraseCalls, 1); assert.equal(objectPresent, false);
  assert.equal(await db.sql(`SELECT state FROM interrogation_private.audio_deletion_jobs WHERE session_key=${literal(receipt.key)};`), 'pending');
  await db.sql(`UPDATE interrogation_private.audio_deletion_jobs SET lease_until=clock_timestamp()-interval '1 second'
    WHERE session_key=${literal(receipt.key)};`);
  assert.deepEqual(await cleanHostedAudio({ apply: true, limit: 1 }, { receipts: new HostedAudioRetention(rpc), erase }),
    { kind: 'applied', claimed: 1, deleted: 1, pending: 0, deferred: 1 });
  assert.equal(eraseCalls, 2);
  assert.equal(await db.sql(`SELECT state='deleted' AND fence=2 FROM interrogation_private.audio_deletion_jobs
    WHERE session_key=${literal(receipt.key)};`), 't');
  assert.equal((await db.rpc('interrogation_voice_claim_in_bucket', [...receipt.args, literal(bucket)])).kind, 'expired');
  assert.deepEqual(await snapshot(db, ['work_usage', 'work_reservations']), budgets);
  console.log('PASS production worker + actual PostgreSQL: controlled object removal followed by interrupted completion stays pending; explicit later batch confirms absence and finishes higher fence; no paid retry or budget refund');
}
async function privacy(db: Database) {
  const rpcArgs: Record<string, string[]> = { interrogation_voice_claim_in_bucket: Array(14).fill('NULL'),
    interrogation_audio_retention_preview: ['25'], interrogation_audio_retention_claim: [literal(owner), '25'],
    interrogation_audio_retention_finish: ['NULL', 'NULL', 'NULL'] };
  for (const role of ['anon', 'authenticated']) {
    for (const [name, args] of Object.entries(rpcArgs)) await assert.rejects(db.rpc(name, args, role), /permission denied/);
  }
  for (const role of ['anon', 'authenticated', 'service_role']) {
    await assert.rejects(db.rpc('interrogation_voice_claim', Array(13).fill('NULL'), role), /permission denied/);
    for (const table of ['audio_deletion_jobs', 'voice_requests']) {
      await assert.rejects(db.sql(`SET ROLE ${role}; SELECT * FROM interrogation_private.${table};`), /permission denied/);
    }
    await assert.rejects(db.sql(`SET ROLE ${role}; SELECT interrogation_private.audio_retention_batch(NULL,25);`), /permission denied/);
  }
  assert.equal(await db.sql(`SELECT count(*) FROM pg_proc p,
    LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
    WHERE p.proname IN (${Object.keys(rpcArgs).map(literal).join(',')},'audio_retention_batch','protect_audio_bucket')
      AND a.grantee=0 AND a.privilege_type='EXECUTE';`), '0');
  console.log('PASS roles: old claim revoked from service role; anon/authenticated cannot execute new RPCs; direct private rows/helpers denied; PUBLIC execute absent; worker receives only object/job metadata');
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
      '016_hosted_export_page', '017_hosted_voice', '018_hosted_retention', '019_hosted_audio_retention']) {
      await db.migrate(`database/migrations/${file}.sql`);
    }
    await provenance(db); await boundaries(db); await raceAndRecovery(db); await lockedAndBounded(db); await workerRecovery(db); await privacy(db);
    assert.equal(networkCalls, 0);
    console.log('Scope: actual disposable PostgreSQL migration/RPC execution; synthetic receipts only. Network/provider/storage calls: 0. No live migration, cleanup or actual object deletion claimed.');
  } finally { globalThis.fetch = originalFetch; await db.stop(); console.log('CLEANUP isolated cluster stopped and temporary directory removed'); }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
