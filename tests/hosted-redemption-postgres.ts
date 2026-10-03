import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { isolatedPostgres, json, literal } from './hosted-storage-postgres-cluster.mjs';
import { HostedRedemptionStorage } from '../src/lib/storage/hosted/redemption';
import { HostedSessionStorage } from '../src/lib/storage/hosted/session';
import { hashKey, type HostedSnapshot } from '../src/lib/storage/hosted/contracts';
import type { HostedRpc } from '../src/lib/storage/hosted/rpc';
import type { GameExport } from '../src/lib/session/exports/storage';

type Database = Awaited<ReturnType<typeof isolatedPostgres>>;
function transport(database: Database): HostedRpc {
  return async (name, args) => {
    assert.match(name, /^interrogation_[a-z_]+$/);
    const parameters = Object.entries(args).map(([key, value]) => {
      assert.match(key, /^p_[a-z_]+$/);
      const sqlValue = value === null ? 'NULL' : typeof value === 'object' ? json(value)
        : typeof value === 'number' ? String(value) : literal(value);
      return `${key} => ${sqlValue}`;
    });
    return database.rpc(name, parameters);
  };
}
async function seed(sessions: HostedSessionStorage, options: { issuedAt?: number; ranked?: boolean } = {}) {
  const id = randomBytes(24).toString('hex'), winToken = randomBytes(16).toString('hex');
  const now = Date.now(), ranked = options.ranked ?? true;
  const caseData = { difficulty: 'easy', setting: 'startup', case_number: 'FIXTURE', suspect_name: 'Fixture',
    playMode: ranked ? 'challenge' : 'relaxed' };
  const record: HostedSnapshot = { version: 1, revision: 0, requests: {}, session: { id,
    caseData, conversationHistory: [], createdAt: now - 1000, startTime: now - 1000, lastActivity: now,
    endedAt: null, status: 'active', outcome: null, timerMode: ranked ? 'countdown' : 'unlimited',
    hintsUsed: 0, accusationsUsed: 0, questionsAsked: 1, currentStress: 2, cluesCollected: 1 } };
  assert.equal((await sessions.create(record)).kind, 'created');
  const action = await sessions.claim({ sessionId: id, requestId: 'fixture-terminal', fingerprint: hashKey('win') });
  assert.equal(action.kind, 'claimed'); if (action.kind !== 'claimed') throw Error('Expected fixture claim');
  const stats = { difficulty: 'easy', timeElapsed: 1, playMode: caseData.playMode, ranked,
    hintsUsed: 0, accusationsUsed: 1, questionsAsked: 1, score: 1498, detectiveRating: 'Veteran' };
  const terminal: HostedSnapshot = { ...action.record, session: { ...action.record.session, winToken,
    status: 'won', outcome: 'win', endedAt: now, accusationsUsed: 1, acceptedAccusation: { text: 'Fixture contradiction' } },
  token: { issuedAt: options.issuedAt ?? now, consumed: false, snapshot: { stats,
    caseNumber: 'FIXTURE', caseSetting: 'startup', suspectName: 'Fixture', stressLevel: 2, cluesFound: 1 } } };
  const exported: GameExport = { session_id: id, case_data: caseData, conversation: [], outcome: 'win',
    difficulty: 'easy', setting: 'startup', stats: { ...stats, maxStress: 2, cluesCollected: 1 },
    accusation_text: 'Fixture contradiction', accusation_correct: true, created_at: new Date(now).toISOString() };
  assert.equal((await sessions.complete(action, terminal, { status: 200, body: { correct: true } }, exported)).kind, 'committed');
  return { sessionId: id, winToken, playerName: 'ABC' };
}
async function rollback(database: Database, scores: HostedRedemptionStorage, sessions: HostedSessionStorage) {
  const submission = await seed(sessions);
  const before = await sessions.load(submission.sessionId);
  await database.sql(`CREATE FUNCTION public.fixture_score_failure() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'fixture score failure'; END $$;
    CREATE TRIGGER fixture_score_failure BEFORE INSERT ON public.leaderboard
    FOR EACH ROW EXECUTE FUNCTION public.fixture_score_failure();`);
  await assert.rejects(scores.redeem(submission), /fixture score failure/);
  assert.deepEqual(await sessions.load(submission.sessionId), before);
  assert.equal(await database.sql('SELECT count(*) FROM public.leaderboard;'), '0');
  await database.sql('DROP TRIGGER fixture_score_failure ON public.leaderboard; DROP FUNCTION public.fixture_score_failure();');
  await database.sql(`CREATE FUNCTION public.fixture_consume_failure() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'fixture consume failure'; END $$;
    CREATE TRIGGER fixture_consume_failure BEFORE UPDATE ON interrogation_private.game_sessions
    FOR EACH ROW EXECUTE FUNCTION public.fixture_consume_failure();`);
  await assert.rejects(scores.redeem(submission), /fixture consume failure/);
  assert.equal(await database.sql('SELECT count(*) FROM public.leaderboard;'), '0', 'insert rolls back when grant consumption fails');
  assert.deepEqual(await sessions.load(submission.sessionId), before);
  await database.sql('DROP TRIGGER fixture_consume_failure ON interrogation_private.game_sessions; DROP FUNCTION public.fixture_consume_failure();');
  return submission;
}
async function concurrency(database: Database, scores: HostedRedemptionStorage, sessions: HostedSessionStorage) {
  const submission = await rollback(database, scores, sessions);
  const prior = await sessions.load(submission.sessionId);
  const results = await Promise.all([scores.redeem(submission), scores.redeem(submission)]);
  assert.deepEqual(results.map(value => value.kind).sort(), ['redeemed', 'replay']);
  const redeemed = results.find(value => value.kind === 'redeemed');
  assert.ok(redeemed && 'receipt' in redeemed);
  assert.deepEqual(Object.keys(redeemed.receipt).sort(), ['id', 'playerName', 'score', 'success']);
  assert.equal(redeemed.receipt.score, 1498); assert.equal(redeemed.receipt.playerName, 'ABC');
  const restored = await sessions.load(submission.sessionId);
  assert.equal((restored?.token as { consumed: boolean }).consumed, true);
  assert.equal(restored?.revision, prior!.revision + 1);
  assert.deepEqual(restored?.session, prior?.session, 'redemption does not rewrite terminal gameplay');
  assert.equal((await scores.redeem({ ...submission, playerName: 'XYZ' })).kind, 'conflict');
  assert.equal((await scores.redeem({ ...submission, winToken: '0'.repeat(32) })).kind, 'invalid');
  await database.sql(`UPDATE interrogation_private.game_sessions SET expires_at=clock_timestamp()-interval '1 second'
    WHERE session_key=${literal(hashKey(submission.sessionId))};`);
  assert.deepEqual(await scores.redeem(submission), { kind: 'replay', receipt: redeemed.receipt });
  assert.equal(await database.sql('SELECT count(*) FROM public.leaderboard;'), '1');
  await assert.rejects(database.sql(`UPDATE public.leaderboard SET score=99999 WHERE session_id=${literal(submission.sessionId)};`), /immutable/);
  console.log('PASS redemption: concurrent one-row insert/consume, canonical public receipt, revision advance, name/token binding and post-expiry replay; forced insert/consume rollback');
}
async function rejection(database: Database, scores: HostedRedemptionStorage, sessions: HostedSessionStorage) {
  assert.equal((await scores.redeem(await seed(sessions, { issuedAt: Date.now() - 1801000 }))).kind, 'invalid');
  assert.equal((await scores.redeem(await seed(sessions, { issuedAt: Date.now() + 60000 }))).kind, 'invalid');
  assert.equal((await scores.redeem(await seed(sessions, { ranked: false }))).kind, 'unranked');
  const submission = await seed(sessions);
  const action = await sessions.claim({ sessionId: submission.sessionId, requestId: 'pending-result-read', fingerprint: hashKey('read') });
  assert.equal(action.kind, 'claimed'); if (action.kind !== 'claimed') throw Error('Expected fixture claim');
  assert.equal((await scores.redeem(submission)).kind, 'busy');
  await database.sql(`UPDATE interrogation_private.game_sessions SET lease_until=clock_timestamp()-interval '1 second'
    WHERE session_key=${literal(hashKey(submission.sessionId))};`);
  assert.equal((await scores.redeem(submission)).kind, 'redeemed');
  assert.equal((await sessions.complete(action, action.record, { status: 200, body: {} })).kind, 'stale');
  for (const role of ['anon', 'authenticated']) {
    await assert.rejects(database.rpc('interrogation_redeem_win',
      [literal(hashKey(submission.sessionId)), literal(hashKey(submission.winToken)), literal('ABC')], role), /permission denied/);
  }
  console.log('PASS redemption authority: expired/future grant, unranked, active lease, stale writer and anonymous RPC denied');
}
async function main() {
  const database = await isolatedPostgres();
  try {
    for (const file of ['001_private_leaderboard', '004_leaderboard_play_mode', '006_hosted_sessions',
      '008_hosted_terminal_export', '010_hosted_redemption', '015_hosted_request_identity']) await database.migrate(`database/migrations/${file}.sql`);
    console.log(`Database: ${await database.sql('SHOW server_version;')}`);
    const rpc = transport(database), sessions = new HostedSessionStorage(rpc), scores = new HostedRedemptionStorage(rpc);
    await concurrency(database, scores, sessions);
    await rejection(database, scores, sessions);
    console.log('Scope: actual hosted TypeScript adapters plus PostgreSQL transactions. No live Supabase/PostgREST, hosted route, provider, voice, browser or deployment.');
  } finally { await database.stop(); console.log('CLEANUP isolated database removed'); }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
