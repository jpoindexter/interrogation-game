import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { HostedSessionStorage } from '../src/lib/storage/hosted/session';
import { HostedRedemptionStorage } from '../src/lib/storage/hosted/redemption';
import { retainHostedExports } from '../src/lib/storage/hosted/export-retention';
import { hashKey } from '../src/lib/storage/hosted/contracts';
import { isolatedPostgres, json, literal } from './hosted-storage-postgres-cluster.mjs';
import { age, exportInsert, seed, snapshot, transport, waitForSleep, type Database, type Fixture } from './hosted-export-retention-fixture';

const batch = (db: Database, apply = false, limit = 25, days = 30) => retainHostedExports({ apply, limit, days }, transport(db));
const scoreInsert = (fixture: Fixture) => `INSERT INTO public.leaderboard(session_id,player_name,score)
  VALUES(${literal(fixture.id)},'XYZ',9999);`;
const preserved = (db: Database) => db.sql(`SELECT jsonb_build_object(
  'scores',(SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY id),'[]') FROM public.leaderboard l),
  'identities',(SELECT coalesce(jsonb_agg(to_jsonb(s)-'record'-'lease_owner'-'lease_until' ORDER BY session_key),'[]')
    FROM interrogation_private.game_sessions s),
  'usage',(SELECT coalesce(jsonb_agg(to_jsonb(u) ORDER BY to_jsonb(u)::text),'[]') FROM interrogation_private.work_usage u),
  'reservations',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text),'[]') FROM interrogation_private.work_reservations r));`);
async function lifecycle(db: Database) {
  const scored = await seed(db), unscored = await seed(db, false), relaxed = await seed(db, false, false);
  for (const f of [scored, unscored, relaxed]) await age(db, f);
  const before = await snapshot(db), identities = await preserved(db);
  const expected = { kind: 'preview', sessions: 3, exports: 3, scoreReceipts: 1, deferred: 0 };
  assert.deepEqual(await batch(db), expected);
  assert.deepEqual(await snapshot(db), before, 'preview mutates no database table');
  assert.deepEqual(await batch(db, true), { ...expected, kind: 'applied' });
  assert.equal(await preserved(db), identities, 'scores, identity/fence/revision and budgets unchanged');
  assert.equal(await db.sql("SELECT count(*) FROM interrogation_private.game_sessions WHERE record='{}';"), '3');
  assert.equal(await db.sql('SELECT count(*) FROM public.game_exports;'), '0');
  assert.equal(await db.sql('SELECT count(*) FROM interrogation_private.score_replay_receipts;'), '1');
  const compact = JSON.parse(await db.sql('SELECT to_jsonb(r) FROM interrogation_private.score_replay_receipts r;'));
  assert.deepEqual(Object.keys(compact).sort(), ['player_name', 'receipt', 'session_key', 'token_hash']);
  assert.equal(compact.token_hash, hashKey(scored.submission.winToken));
  assert.deepEqual(compact.receipt, scored.receipt);
  const scores = new HostedRedemptionStorage(transport(db)), sessions = new HostedSessionStorage(transport(db));
  assert.deepEqual(await scores.redeem(scored.submission), { kind: 'replay', receipt: scored.receipt });
  assert.equal((await scores.redeem({ ...scored.submission, winToken: '0'.repeat(32) })).kind, 'invalid');
  assert.equal((await scores.redeem({ ...scored.submission, playerName: 'XYZ' })).kind, 'conflict');
  assert.equal((await scores.redeem(unscored.submission)).kind, 'invalid', 'cannot mint score after payload erasure');
  assert.deepEqual(await batch(db, true), { kind: 'applied', sessions: 0, exports: 0, scoreReceipts: 0, deferred: 0 });
  for (const fixture of [scored, unscored]) {
    await assert.rejects(db.sql(exportInsert(fixture)), /cannot be recreated/);
    await assert.rejects(db.sql(scoreInsert(fixture)), /cannot be created/);
    assert.equal((await sessions.create(fixture.record)).kind, 'unavailable');
    assert.equal((await sessions.claim({ sessionId: fixture.id, requestId: 'new-claim', fingerprint: hashKey('new') })).kind, 'unavailable');
    assert.equal((await sessions.complete(fixture.action, fixture.terminal, fixture.response, fixture.exported)).kind, 'unavailable');
  }
  for (const table of ['score_replay_receipts', 'leaderboard']) {
    const schema = table === 'leaderboard' ? 'public' : 'interrogation_private';
    await assert.rejects(db.sql(`DELETE FROM ${schema}.${table};`), /immutable/);
  }
  await assert.rejects(db.sql("UPDATE interrogation_private.score_replay_receipts SET player_name='ZZZ';"), /immutable/);
  await db.sql("INSERT INTO public.leaderboard(session_id,player_name,score) VALUES('legacy-score','XYZ',1);");
  await assert.rejects(db.sql(`UPDATE public.leaderboard SET session_id=${literal(unscored.id)} WHERE session_id='legacy-score';`), /immutable/);
  await db.sql("UPDATE public.leaderboard SET score=2 WHERE session_id='legacy-score'; DELETE FROM public.leaderboard WHERE session_id='legacy-score';");
  assert.equal(await db.sql('SELECT count(*) FROM interrogation_private.game_requests;'), '3', '020 leaves bounded action cleanup to 018');
  assert.equal((await db.rpc('interrogation_retention_batch', ['true', '1'])).requests, 1);
  assert.equal(await db.sql('SELECT count(*) FROM interrogation_private.game_requests;'), '2');
  assert.deepEqual(await scores.redeem(scored.submission), { kind: 'replay', receipt: scored.receipt });
  console.log('PASS real terminal export/redemption -> preview unchanged -> atomic retention -> exact credential-bound receipt replay; tombstones/scores/budgets preserved; no recreate, late action, duplicate score or repeat cleanup');
}
async function eligibility(db: Database) {
  const active = await seed(db), young = await seed(db), parentLease = await seed(db), voiceLease = await seed(db);
  await age(db, young, 29); await age(db, parentLease); await age(db, voiceLease);
  const owner = randomUUID(), request = hashKey('voice-retention');
  await db.sql(`UPDATE interrogation_private.game_sessions SET expires_at=clock_timestamp()+interval '1 hour'
    WHERE session_key=${literal(voiceLease.key)};`);
  const voiceArgs = [literal(voiceLease.key), literal(request), "'tts'", literal(hashKey('voice')), '2', literal(owner),
    "'export-retention'", '1', '100', '10000', '1000', '100000', '3600', "'fixture-audio'"];
  assert.equal((await db.rpc('interrogation_voice_claim_in_bucket', voiceArgs)).kind, 'claimed');
  await age(db, voiceLease);
  await db.sql(`UPDATE interrogation_private.game_sessions SET lease_owner=${literal(owner)},lease_until=clock_timestamp()+interval '1 hour'
    WHERE session_key=${literal(parentLease.key)};`);
  const before = await snapshot(db);
  assert.equal((await batch(db)).sessions, 0);
  assert.deepEqual(await snapshot(db), before);
  await db.sql(`UPDATE interrogation_private.voice_requests SET lease_until=clock_timestamp()-interval '1 second'
    WHERE session_key=${literal(voiceLease.key)};`);
  const protectedBefore = await preserved(db);
  assert.equal((await batch(db, true)).sessions, 1);
  assert.equal(await preserved(db), protectedBefore, 'nonempty allowances unchanged');
  assert.equal((await db.rpc('interrogation_voice_claim_in_bucket', voiceArgs)).kind, 'unavailable');
  const response = { status: 200, contentType: 'audio/mpeg', objectKey: `${voiceLease.key}/tts/${request}.mp3`, bytes: 10, sha256: hashKey('audio') };
  assert.equal((await db.rpc('interrogation_voice_finish', [literal(voiceLease.key), literal(request), "'tts'",
    literal(hashKey('voice')), literal(owner), '1', json(response)])).kind, 'stale');
  assert.equal(await db.sql(`SELECT record<>'{}' FROM interrogation_private.game_sessions WHERE session_key=${literal(active.key)};`), 't');
  await assert.rejects(db.sql(`UPDATE public.game_exports SET stats='{}' WHERE session_id=${literal(active.id)};`), /immutable/);
  await assert.rejects(db.sql(`DELETE FROM public.game_exports WHERE session_id=${literal(active.id)};`), /immutable/);
  await db.sql("INSERT INTO public.game_exports(session_id,case_data,conversation,outcome,difficulty,stats) VALUES('legacy-fixture','{}','[]','win','easy','{}') ON CONFLICT(session_id) DO UPDATE SET stats=excluded.stats;");
  await db.sql("INSERT INTO public.game_exports(session_id,case_data,conversation,outcome,difficulty,stats) VALUES('legacy-fixture','{}','[]','win','easy','{\"v\":1}') ON CONFLICT(session_id) DO UPDATE SET stats=excluded.stats;");
  assert.equal(await db.sql("SELECT stats->>'v' FROM public.game_exports WHERE session_id='legacy-fixture';"), '1');
  await db.sql("DELETE FROM public.game_exports WHERE session_id='legacy-fixture';");
  console.log('PASS eligibility: days threshold, active sessions, live parent and voice leases; expired voice lease admits retention; late voice claim/finish blocked; actual allowances unchanged; active hosted immutability and legacy upsert/delete preserved');
}
async function deferred(db: Database) {
  const mismatch = await seed(db), missing = await seed(db), scoreOnly = await seed(db);
  for (const fixture of [mismatch, missing]) await age(db, fixture, 40);
  await age(db, scoreOnly, 31);
  await db.sql(`UPDATE interrogation_private.game_sessions SET record=jsonb_set(record,'{session,winToken}',${json('0'.repeat(32))}) WHERE session_key=${literal(mismatch.key)};
    UPDATE interrogation_private.game_sessions SET record=record#-'{session,winToken}' WHERE session_key=${literal(missing.key)};`);
  // Fixture-only simulate a score whose original export was absent before 020.
  await db.sql(`BEGIN; CREATE TEMP TABLE fixture_saved AS SELECT record FROM interrogation_private.game_sessions WHERE session_key=${literal(scoreOnly.key)};
    UPDATE interrogation_private.game_sessions SET record='{}' WHERE session_key=${literal(scoreOnly.key)};
    DELETE FROM public.game_exports WHERE session_id=${literal(scoreOnly.id)};
    UPDATE interrogation_private.game_sessions SET record=(SELECT record FROM fixture_saved) WHERE session_key=${literal(scoreOnly.key)}; COMMIT;`);
  const before = await snapshot(db);
  assert.deepEqual(await batch(db, false, 1), { kind: 'preview', sessions: 1, exports: 0, scoreReceipts: 1, deferred: 1 });
  assert.deepEqual(await snapshot(db), before);
  assert.deepEqual(await batch(db, true, 1), { kind: 'applied', sessions: 1, exports: 0, scoreReceipts: 1, deferred: 1 });
  assert.equal((await batch(db)).deferred, 2, 'invalid bindings do not starve valid later candidates');
  for (const fixture of [mismatch, missing]) {
    assert.equal(await db.sql(`SELECT record<>'{}' FROM interrogation_private.game_sessions WHERE session_key=${literal(fixture.key)};`), 't');
    assert.equal(await db.sql(`SELECT count(*) FROM public.game_exports WHERE session_id=${literal(fixture.id)};`), '1');
  }
  assert.deepEqual(await new HostedRedemptionStorage(transport(db)).redeem(scoreOnly.submission), { kind: 'replay', receipt: scoreOnly.receipt });
  console.log('PASS invalid/missing canonical score token bindings deferred unchanged; capped deferred count; malformed oldest rows do not starve later valid score-only cleanup/replay');
}
async function races(db: Database) {
  const fixture = await seed(db); await age(db, fixture);
  const blocker = db.sql(`SET application_name='export_retention_lock'; BEGIN;
    SELECT session_key FROM interrogation_private.game_sessions WHERE session_key=${literal(fixture.key)} FOR UPDATE;
    SELECT pg_sleep(1); COMMIT;`);
  try { await waitForSleep(db, 'export_retention_lock'); assert.equal((await batch(db, true)).sessions, 0); }
  finally { await blocker; }
  const scores = new HostedRedemptionStorage(transport(db));
  const [a, b, replay] = await Promise.all([batch(db, true, 1), batch(db, true, 1), scores.redeem(fixture.submission)]);
  assert.deepEqual([a.sessions, b.sessions].sort(), [0, 1]);
  assert.deepEqual(replay, { kind: 'replay', receipt: fixture.receipt });
  assert.deepEqual(await scores.redeem(fixture.submission), replay);
  const late = await seed(db, false); await age(db, late);
  const cleaner = db.sql("SET application_name='export_retention_commit'; BEGIN; SELECT public.interrogation_export_retention_batch(true,1,30); SELECT pg_sleep(1); COMMIT;");
  try {
    await waitForSleep(db, 'export_retention_commit');
    await Promise.all([assert.rejects(db.sql(exportInsert(late)), /cannot be recreated/),
      assert.rejects(db.sql(scoreInsert(late)), /cannot be created/)]);
  } finally { await cleaner; }
  assert.equal(await db.sql(`SELECT count(*) FROM public.game_exports WHERE session_id=${literal(late.id)};`), '0');
  console.log('PASS real concurrency: parent SKIP LOCKED; competing retention batches clean once; concurrent redemption returns original receipt; export/score inserts waiting behind cleanup cannot recreate erased data');
}
async function rollbackAndBounds(db: Database) {
  const fixture = await seed(db); await age(db, fixture, 31);
  const before = await snapshot(db);
  await db.sql(`CREATE FUNCTION public.fail_export_retention() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'fixture retention rollback'; END $$;
    CREATE TRIGGER fail_export_retention BEFORE DELETE ON public.game_exports FOR EACH ROW EXECUTE FUNCTION public.fail_export_retention();`);
  await assert.rejects(batch(db, true), /fixture retention rollback/);
  assert.deepEqual(await snapshot(db), before, 'failed delete rolls back compact receipt and parent scrub');
  await db.sql('DROP TRIGGER fail_export_retention ON public.game_exports; DROP FUNCTION public.fail_export_retention();');
  assert.equal((await batch(db, true, 100, 3650)).sessions, 0);
  const second = await seed(db); await age(db, second, 31);
  assert.equal((await batch(db, true, 1)).sessions, 1);
  assert.equal((await batch(db, true, 100)).sessions, 1);
  for (const args of [['NULL', '25', '30'], ['false', 'NULL', '30'], ['false', '0', '30'], ['false', '101', '30'],
    ['false', '25', 'NULL'], ['false', '25', '0'], ['false', '25', '3651']]) {
    assert.deepEqual(await db.rpc('interrogation_export_retention_batch', args), { kind: 'invalid' });
  }
  assert.equal((await db.rpc('interrogation_export_retention_batch', [])).kind, 'preview');
  assert.equal((await batch(db, false, 100, 1)).sessions, 1, 'one-day minimum admits 29-day-old unleased game');
  console.log('PASS failure atomicity and limits: receipt creation/parent scrub/export delete rollback together; default preview; 1/100 limits; 1/3650 days; null/out-of-range SQL arguments rejected');
}
async function roles(db: Database) {
  for (const role of ['anon', 'authenticated']) {
    await assert.rejects(db.rpc('interrogation_export_retention_batch', [], role), /permission denied/);
    await assert.rejects(db.rpc('interrogation_redeem_win', Array(3).fill('NULL'), role), /permission denied/);
  }
  for (const role of ['anon', 'authenticated', 'service_role']) {
    await assert.rejects(db.rpc('interrogation_redeem_win_legacy', Array(3).fill('NULL'), role), /permission denied/);
    for (const statement of ['SELECT * FROM interrogation_private.score_replay_receipts',
      "INSERT INTO interrogation_private.score_replay_receipts VALUES(repeat('a',64),repeat('b',64),'ABC','{}')",
      "SELECT interrogation_private.export_retention_binding(repeat('a',64),'{}')"]) {
      await assert.rejects(db.sql(`SET ROLE ${role}; ${statement};`), /permission denied/);
    }
  }
  assert.equal(await db.sql(`SELECT count(*) FROM pg_proc p,LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
    WHERE p.proname IN ('interrogation_export_retention_batch','interrogation_redeem_win','interrogation_redeem_win_legacy',
    'export_retention_binding','guard_scrubbed_score_insert','protect_score_replay_receipt') AND a.grantee=0 AND a.privilege_type='EXECUTE';`), '0');
  console.log('PASS privacy: new RPCs service-only; renamed legacy RPC inaccessible directly; private compact receipts/helpers inaccessible to all client roles; PUBLIC execute revoked; batch outputs aggregates only');
}
async function main() {
  const db = await isolatedPostgres(), originalFetch = globalThis.fetch; let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('No network permitted'); };
  try {
    console.log(`Runtime: ${process.version}; PostgreSQL: ${await db.sql('SHOW server_version;')}`);
    for (const file of ['001_private_leaderboard','004_leaderboard_play_mode','006_hosted_sessions','007_hosted_budgets',
      '008_hosted_terminal_export','009_hosted_claimed_work','010_hosted_redemption','011_hosted_generation',
      '012_hosted_generation_finish','013_hosted_endpoint_limits','014_hosted_reads','015_hosted_request_identity',
      '016_hosted_export_page','017_hosted_voice','018_hosted_retention','019_hosted_audio_retention','020_hosted_export_retention']) {
      await db.migrate(`database/migrations/${file}.sql`);
    }
    await lifecycle(db); await eligibility(db); await deferred(db); await races(db); await rollbackAndBounds(db); await roles(db);
    assert.equal(calls, 0);
    console.log('Scope: full-chain disposable PostgreSQL plus production session/redemption/retention adapters; synthetic game data only; network/provider/storage calls: 0. No live migration, live cleanup, browser or deployment claimed.');
  } finally { globalThis.fetch = originalFetch; await db.stop(); console.log('CLEANUP isolated cluster stopped and temporary directory removed'); }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
