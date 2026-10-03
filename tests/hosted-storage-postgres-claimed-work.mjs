import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { json, literal } from './hosted-storage-postgres-cluster.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');

async function fixture(db, deployment = 'claimed-work') {
  const id = hash(`${deployment}-fixture`).slice(0, 48);
  const session = hash(id);
  const request = hash('claimed-question');
  const owner = randomUUID();
  const action = hash('question-body');
  const record = { version: 1, revision: 0, requests: {}, session: {
    id, status: 'active', outcome: null, lastActivity: 0, conversationHistory: [],
  } };
  assert.equal((await db.rpc('interrogation_session_create', [literal(session), json(record)])).kind, 'created');
  const claim = await db.rpc('interrogation_session_claim', [literal(session), literal(request), literal(action), literal(owner)]);
  assert.equal(claim.kind, 'claimed');
  const args = ({ operation = 'provider-draft', claimant = owner, fence = claim.fence,
    revision = claim.revision, fingerprint = action, requestKey = request } = {}) => [
    literal(deployment), literal(session), literal(hash(operation)), literal(hash('provider-body')),
    literal('ai'), '3', '1', '3', '1', '3', '3600', literal(requestKey), literal(fingerprint),
    literal(claimant), String(fence), String(revision),
  ];
  return { session, request, claim, args, reserve: options => db.rpc('interrogation_reserve_claimed_work', args(options)) };
}

export async function claimedWorkScenarios(db) {
  const work = await fixture(db);
  for (const options of [{ claimant: randomUUID() }, { fence: work.claim.fence + 1 },
    { revision: work.claim.revision + 1 }, { requestKey: hash('missing') }]) {
    assert.equal((await work.reserve(options)).kind, 'stale');
  }
  assert.equal((await work.reserve({ fingerprint: hash('changed action') })).kind, 'conflict');
  assert.equal(await db.sql("SELECT count(*) FROM interrogation_private.work_reservations WHERE deployment='claimed-work';"), '0');
  const simultaneous = await Promise.all([work.reserve(), work.reserve()]);
  assert.deepEqual(simultaneous.map(result => result.kind).sort(), ['already_reserved', 'reserved']);
  assert.equal((await work.reserve()).kind, 'already_reserved', 'ambiguous response must never grant another provider call');
  assert.equal((await work.reserve({ operation: 'second-effect' })).kind, 'exhausted');
  assert.equal(await db.sql("SELECT count(*) FROM interrogation_private.work_reservations WHERE deployment='claimed-work';"), '1');
  await revokedPrivileges(db, work);
  await lostAuthority(db, work);
  await queuedAuthority(db);
  console.log('PASS claimed work: owner/fence/revision/request checked before spending; concurrent reservation once; ambiguous replay refuses new permission; expired lease/session denied');
}

async function queuedAuthority(db) {
  const work = await fixture(db, 'queued-work');
  const blocker = db.sql(`SET application_name='claimed_work_blocker'; BEGIN;
    SELECT pg_advisory_xact_lock(hashtextextended('interrogation:work:queued-work',0));
    SELECT pg_sleep(1.4); COMMIT;`);
  try {
    let held = false;
    for (let attempt = 0; attempt < 20 && !held; attempt++) {
      held = await db.sql(`SELECT count(*) FROM pg_locks l JOIN pg_stat_activity a ON a.pid=l.pid
        WHERE a.application_name='claimed_work_blocker' AND l.locktype='advisory' AND l.granted;`) === '1';
      if (!held) await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.ok(held, 'observed blocker holds the deployment lock before reservation');
    await db.sql(`UPDATE interrogation_private.game_sessions SET lease_until=clock_timestamp()+interval '0.2 seconds'
      WHERE session_key=${literal(work.session)};`);
    assert.equal((await work.reserve()).kind, 'stale', 'lease must be rechecked after waiting for deployment lock');
    assert.equal(await db.sql("SELECT count(*) FROM interrogation_private.work_reservations WHERE deployment='queued-work';"), '0');
  } finally { await blocker; }
  console.log('PASS queued reservation: real lease expiry while waiting on deployment lock cannot spend quota');
}

async function revokedPrivileges(db, work) {
  for (const role of ['anon', 'authenticated']) {
    await assert.rejects(db.rpc('interrogation_reserve_claimed_work', work.args(), role), /permission denied/);
  }
  await assert.rejects(db.rpc('interrogation_reserve_work', work.args().slice(0, 11)), /permission denied/);
  const publicPermission = await db.sql(`SELECT count(*) FROM pg_proc p,
    LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
    WHERE p.proname='interrogation_reserve_claimed_work' AND a.grantee=0 AND a.privilege_type='EXECUTE';`);
  assert.equal(publicPermission, '0');
  console.log('PASS claimed-work privileges: public/anonymous access denied; service role cannot bypass claim through original reservation RPC');
}

async function lostAuthority(db, work) {
  await db.sql(`UPDATE interrogation_private.game_sessions SET lease_until=clock_timestamp()-interval '1 second'
    WHERE session_key=${literal(work.session)};`);
  assert.equal((await work.reserve({ operation: 'stale-effect' })).kind, 'stale');
  assert.equal((await work.reserve()).kind, 'stale', 'expired claim does not regain permission through existing reservation');
  await db.sql(`UPDATE interrogation_private.game_sessions SET expires_at=clock_timestamp()-interval '1 second'
    WHERE session_key=${literal(work.session)};`);
  assert.equal((await work.reserve({ operation: 'expired-effect' })).kind, 'unavailable');
  assert.equal(await db.sql("SELECT count(*) FROM interrogation_private.work_reservations WHERE deployment='claimed-work';"), '1');
}
