import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { json, literal } from './hosted-storage-postgres-cluster.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const checkpoint = { data: { title: 'Synthetic case', difficulty: 'easy' }, learnedTactics: [], totalPriorGames: 0 };
function client(db, name) {
  const key = hash(name), fingerprint = hash('options'), owner = randomUUID();
  const identity = (claim, claimant = owner) => [literal(key), literal(fingerprint), literal(claimant), String(claim.fence)];
  const claim = (claimant = owner, body = fingerprint) => db.rpc('interrogation_generation_claim', [literal(key), literal(body), literal(claimant)]);
  const status = () => db.rpc('interrogation_generation_status', [literal(key)]);
  const write = (receipt, data = checkpoint, phase = 'reviewing', claimant = owner) => db.rpc('interrogation_generation_write',
    [...identity(receipt, claimant), literal(phase), data === null ? 'NULL' : json(data)]);
  const finish = (receipt, record, response, claimant = owner) => db.rpc('interrogation_generation_finish',
    [...identity(receipt, claimant), record === null ? 'NULL' : json(record), json(response)]);
  const workArgs = (receipt, claimant = owner) => [literal('generation-fixture'), literal(hash(receipt.sessionId)),
    literal(hash(`${name}:draft`)), literal(hash('prompt')), literal('ai'), '2', '5', '20', '20', '100', '3600',
    literal(key), literal(fingerprint), literal(claimant), String(receipt.fence)];
  const reserve = (receipt, claimant = owner) => db.rpc('interrogation_generation_reserve_work', workArgs(receipt, claimant));
  const expireLease = () => db.sql(`UPDATE interrogation_private.game_generation_requests SET lease_until=clock_timestamp()-interval '1 second'
    WHERE request_key=${literal(key)};`);
  return { key, owner, claim, status, write, finish, reserve, workArgs, expireLease };
}
function initialRecord(receipt) {
  return { version: 1, revision: 0, requests: {}, session: { id: receipt.sessionId,
    status: 'briefing', outcome: null, createdAt: receipt.startedAt, lastActivity: receipt.startedAt,
    caseData: checkpoint.data, conversationHistory: [] } };
}
const success = receipt => ({ status: 200, body: { sessionId: receipt.sessionId, title: 'Synthetic case' } });
const storedSessions = (db, receipt) => db.sql(`SELECT count(*) FROM interrogation_private.game_sessions
  WHERE session_key=${literal(hash(receipt.sessionId))};`);

export async function generationScenarios(db) {
  const flow = client(db, 'generation-recovery');
  const claims = await Promise.all([flow.claim(), flow.claim()]);
  assert.deepEqual(claims.map(item => item.kind).sort(), ['busy', 'claimed']);
  const receipt = claims.find(item => item.kind === 'claimed');
  assert.match(receipt.sessionId, /^[a-f0-9]{48}$/);
  assert.equal((await flow.claim(undefined, hash('changed options'))).kind, 'conflict');
  assert.deepEqual(Object.keys(await flow.status()).sort(), ['kind', 'phase', 'startedAt', 'state']);
  assert.equal((await flow.write(receipt, null, 'generating')).kind, 'saved');
  assert.equal((await flow.reserve(receipt, randomUUID())).kind, 'stale');
  const reservations = await Promise.all([flow.reserve(receipt), flow.reserve(receipt)]);
  assert.deepEqual(reservations.map(item => item.kind).sort(), ['already_reserved', 'reserved']);
  assert.equal(await storedSessions(db, receipt), '0', 'provider reservation precedes session creation');
  assert.equal((await flow.write(receipt)).kind, 'saved');
  assert.equal((await flow.write(receipt)).kind, 'saved', 'same checkpoint retry is immutable replay');
  assert.equal((await flow.write(receipt, { data: { changed: true } })).kind, 'conflict');
  assert.equal((await flow.reserve(receipt)).kind, 'stale', 'saved checkpoint forbids further inference');
  await flow.expireLease();
  const owner = randomUUID(), recovered = await flow.claim(owner);
  assert.equal(recovered.kind, 'claimed');
  assert.equal(recovered.sessionId, receipt.sessionId);
  assert.equal(recovered.startedAt, receipt.startedAt);
  assert.ok(recovered.fence > receipt.fence);
  assert.deepEqual(recovered.checkpoint, checkpoint);
  assert.equal((await flow.write(receipt)).kind, 'stale');
  assert.equal((await flow.reserve(recovered, owner)).kind, 'stale');
  await materialization(db, flow, recovered, owner);
  await interruptedAndFailure(db);
  await expiryAndPrivileges(db, flow, recovered);
  await queuedGeneration(db);
  await queuedMaterialization(db);
  await admissionBound(db);
  console.log('PASS generation: claim/recovery/fencing; private checkpoint; work reserved once; no paid replay; atomic materialization/failure; retained tombstone bound');
}

async function materialization(db, flow, receipt, owner) {
  const record = initialRecord(receipt), response = success(receipt);
  const changed = structuredClone(record);
  changed.session.caseData = { incorrect: true };
  assert.equal((await flow.finish(receipt, changed, response, owner)).kind, 'conflict');
  assert.equal((await flow.finish(receipt, { ...record, token: {} }, response, owner)).kind, 'conflict');
  await db.sql(`CREATE FUNCTION public.fixture_generation_fail() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.state='complete' THEN RAISE EXCEPTION 'generation rollback'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER fixture_generation_fail BEFORE UPDATE ON interrogation_private.game_generation_requests
    FOR EACH ROW EXECUTE FUNCTION public.fixture_generation_fail();`);
  await assert.rejects(flow.finish(receipt, record, response, owner), /generation rollback/);
  assert.equal(await storedSessions(db, receipt), '0', 'generation receipt failure rolls back newly created session');
  await db.sql('DROP TRIGGER fixture_generation_fail ON interrogation_private.game_generation_requests; DROP FUNCTION public.fixture_generation_fail();');
  assert.deepEqual(await flow.finish(receipt, record, response, owner), { kind: 'committed', response });
  assert.equal(await storedSessions(db, receipt), '1');
  assert.deepEqual(await flow.claim(), { kind: 'replay', response });
  assert.deepEqual(await flow.finish(receipt, record, { status: 500, body: { changed: true } }, owner), { kind: 'replay', response });
  const advanced = await db.sql(`UPDATE interrogation_private.game_sessions SET revision=9
    WHERE session_key=${literal(hash(receipt.sessionId))} RETURNING revision;`);
  assert.equal(advanced, '9');
  await flow.claim();
  assert.equal(await db.sql(`SELECT revision FROM interrogation_private.game_sessions WHERE session_key=${literal(hash(receipt.sessionId))};`), '9');
  assert.equal((await flow.status()).phase, 'ready');
  console.log('PASS generation atomicity: forced receipt failure rolls back session; completed response replay preserves later progress');
}

async function interruptedAndFailure(db) {
  const abandoned = client(db, 'generation-abandoned'), receipt = await abandoned.claim();
  await abandoned.expireLease();
  assert.equal((await abandoned.claim()).kind, 'interrupted');
  assert.equal((await abandoned.claim(randomUUID())).kind, 'interrupted');
  assert.equal((await abandoned.reserve(receipt)).kind, 'stale');
  assert.equal((await abandoned.status()).state, 'interrupted');
  const failed = client(db, 'generation-failure'), failedReceipt = await failed.claim();
  const response = { status: 502, body: { error: 'Synthetic provider failure', code: 'AI_FAILURE' } };
  assert.deepEqual(await failed.finish(failedReceipt, null, response), { kind: 'committed', response });
  assert.deepEqual(await failed.claim(), { kind: 'replay', response });
  assert.equal(await storedSessions(db, failedReceipt), '0');
  assert.equal((await failed.reserve(failedReceipt)).kind, 'stale');
}

async function expiryAndPrivileges(db, flow, receipt) {
  await db.sql(`UPDATE interrogation_private.game_generation_requests SET expires_at=clock_timestamp()-interval '1 second'
    WHERE request_key=${literal(flow.key)};`);
  assert.equal((await flow.claim()).kind, 'expired');
  assert.equal((await flow.status()).state, 'expired');
  assert.equal((await flow.reserve(receipt)).kind, 'expired');
  assert.equal((await flow.finish(receipt, initialRecord(receipt), success(receipt))).kind, 'expired');
  await assert.rejects(db.sql('SET ROLE service_role; SELECT * FROM interrogation_private.game_generation_requests;'), /permission denied/);
  for (const role of ['anon', 'authenticated']) {
    await assert.rejects(db.rpc('interrogation_generation_status', [literal(flow.key)], role), /permission denied/);
    await assert.rejects(db.rpc('interrogation_generation_reserve_work', flow.workArgs(receipt), role), /permission denied/);
  }
  const permitted = await db.sql(`SELECT count(*) FROM pg_proc p,
    LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
    WHERE p.proname LIKE 'interrogation_generation_%' AND a.grantee=0 AND a.privilege_type='EXECUTE';`);
  assert.equal(permitted, '0');
}

async function queuedGeneration(db) {
  const flow = client(db, 'generation-queued'), receipt = await flow.claim();
  const args = flow.workArgs(receipt);
  for (const scope of [literal('tts'), 'NULL']) {
    const invalid = [...args]; invalid[4] = scope;
    assert.equal((await db.rpc('interrogation_generation_reserve_work', invalid)).kind, 'invalid');
  }
  const blocker = db.sql(`SET application_name='generation_work_blocker'; BEGIN;
    SELECT pg_advisory_xact_lock(hashtextextended('interrogation:work:generation-fixture',0));
    SELECT pg_sleep(1.4); COMMIT;`);
  try {
    let held = false;
    for (let attempt = 0; attempt < 20 && !held; attempt++) {
      held = await db.sql(`SELECT count(*) FROM pg_locks l JOIN pg_stat_activity a ON a.pid=l.pid
        WHERE a.application_name='generation_work_blocker' AND l.locktype='advisory' AND l.granted;`) === '1';
      if (!held) await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.ok(held, 'observed deployment lock before generation work');
    await db.sql(`UPDATE interrogation_private.game_generation_requests SET lease_until=clock_timestamp()+interval '0.2 seconds'
      WHERE request_key=${literal(flow.key)};`);
    assert.equal((await flow.reserve(receipt)).kind, 'stale');
    assert.equal(await db.sql(`SELECT count(*) FROM interrogation_private.work_reservations
      WHERE deployment='generation-fixture' AND session_key=${literal(hash(receipt.sessionId))};`), '0');
  } finally { await blocker; }
  console.log('PASS generation work: non-AI scope denied; lease expiry during actual deployment-lock wait consumes no quota');
}

async function admissionBound(db) {
  await db.sql(`INSERT INTO interrogation_private.game_generation_requests
    (request_key,fingerprint,session_id,owner,fence,lease_until,created_at,expires_at,phase,state)
    SELECT encode(sha256(convert_to('tombstone:'||n,'UTF8')),'hex'),repeat('a',64),
      substr(encode(sha256(convert_to('session:'||n,'UTF8')),'hex'),1,48),gen_random_uuid(),1,
      clock_timestamp()-interval '2 days',clock_timestamp()-interval '2 days',clock_timestamp()-interval '1 day','preparing','interrupted'
    FROM generate_series(1,1000-(SELECT count(*)::integer FROM interrogation_private.game_generation_requests)) n;`);
  assert.equal((await client(db, 'generation-over-limit').claim()).kind, 'limit');
  assert.equal(await db.sql('SELECT count(*) FROM interrogation_private.game_generation_requests;'), '1000');
  console.log('PASS generation admission: 1000 retained rows include expired tombstones; new intent refused rather than deleting replay protection');
}

async function queuedMaterialization(db) {
  const flow = client(db, 'generation-finish-queued'), receipt = await flow.claim();
  assert.equal((await flow.write(receipt)).kind, 'saved');
  const record = initialRecord(receipt), key = hash(receipt.sessionId);
  assert.equal((await db.rpc('interrogation_session_create', [literal(key), json(record)])).kind, 'created');
  const blocker = db.sql(`SET application_name='generation_finish_blocker'; BEGIN;
    SELECT session_key FROM interrogation_private.game_sessions WHERE session_key=${literal(key)} FOR UPDATE;
    SELECT pg_sleep(1.4); COMMIT;`);
  try {
    let held = false;
    for (let attempt = 0; attempt < 20 && !held; attempt++) {
      held = await db.sql(`SELECT count(*) FROM pg_stat_activity WHERE application_name='generation_finish_blocker'
        AND wait_event='PgSleep';`) === '1';
      if (!held) await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.ok(held, 'observed blocker sleeping after acquiring session row lock');
    await db.sql(`UPDATE interrogation_private.game_generation_requests SET lease_until=clock_timestamp()+interval '0.2 seconds'
      WHERE request_key=${literal(flow.key)};`);
    await assert.rejects(flow.finish(receipt, record, success(receipt)), /authority expired during materialization/);
    assert.equal(await db.sql(`SELECT state FROM interrogation_private.game_generation_requests WHERE request_key=${literal(flow.key)};`), 'pending');
  } finally { await blocker; }
  const owner = randomUUID(), recovered = await flow.claim(owner);
  assert.equal(recovered.kind, 'claimed');
  assert.deepEqual(recovered.checkpoint, checkpoint);
  assert.equal((await flow.finish(recovered, record, success(receipt), owner)).kind, 'committed');
  assert.equal(await storedSessions(db, receipt), '1');
  console.log('PASS generation finish: real session-lock wait expires authority; transaction rejected, checkpoint recovered and same session materialized once');
}
