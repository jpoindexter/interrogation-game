import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { isolatedPostgres, literal } from './hosted-storage-postgres-cluster.mjs';
import { startNext, fixtureTransport } from './hosted-http-server.mjs';
import { http, playEvidence, assertSharedAdmission } from './hosted-http-play.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const migrations = ['001_private_leaderboard', '004_leaderboard_play_mode', '006_hosted_sessions',
  '007_hosted_budgets', '008_hosted_terminal_export', '009_hosted_claimed_work', '010_hosted_redemption',
  '011_hosted_generation', '012_hosted_generation_finish', '013_hosted_endpoint_limits',
  '014_hosted_reads', '015_hosted_request_identity'];

async function interruptAndRecover(first, second, sessionId, database, transport) {
  const held = transport.holdNext();
  const input = { sessionId, requestId: 'question-interrupted-01', playerQuestion: 'Where did you go after leaving?' };
  const pending = http(first, 'interrogate', input).then(() => 'unexpected completion', () => 'disconnected');
  let timer;
  try {
    await Promise.race([held.seen, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Pending provider was not entered')), 10_000);
    })]);
    await first.stop();
    assert.equal(await pending, 'disconnected');
  } finally { clearTimeout(timer); held.release(); }
  // Fault injection advances only the abandoned lease, avoiding a 180-second test sleep.
  await database.sql(`UPDATE interrogation_private.game_sessions SET lease_until=clock_timestamp()-interval '1 second'
    WHERE session_key=${literal(hash(sessionId))};`);
  const resumed = await http(second, `session?sessionId=${sessionId}`);
  assert.equal(resumed.caseData.sessionId, sessionId);
  assert.ok(resumed.pendingRequests.some(item => item.requestId === input.requestId));
  assert.ok(resumed.pendingRequests.every(item => !/^[a-f0-9]{64}$/.test(item.requestId)));
  const calls = transport.calls();
  const replay = await http(second, 'interrogate', input, 409);
  assert.equal(replay.code, 'REQUEST_INTERRUPTED');
  assert.equal(transport.calls(), calls, 'interrupted ID must not pay for another answer');
  return resumed;
}

async function main() {
  const build = (await readFile('.next/BUILD_ID', 'utf8')).trim();
  const database = await isolatedPostgres();
  const directory = await mkdtemp(join(tmpdir(), 'hosted-http-'));
  const servers = [];
  const transport = fixtureTransport(database);
  try {
    for (const migration of migrations) await database.migrate(`database/migrations/${migration}.sql`);
    const first = await startNext(directory, transport); servers.push(first);
    const second = await startNext(directory, transport); servers.push(second);
    assert.notEqual(first.child.pid, second.child.pid);
    console.log(`Actual Next production HTTP acceptance; build=${build}; independent worker processes started.`);
    const health = await http(first, 'health');
    assert.equal(health.status, 'configured'); assert.equal(health.services.storage.provider, 'supabase');
    assert.equal(health.services.voice.configured, false);
    const generation = { requestId: 'authored-http-generation', mode: 'redteam', difficulty: 'easy', playMode: 'challenge' };
    const created = await http(first, 'generate-case', generation);
    const sessionId = created.sessionId;
    assert.match(sessionId, /^[a-f0-9]{48}$/); assert.equal(created.the_truth, undefined);
    assert.deepEqual(await http(second, 'generate-case', generation), created);
    assert.equal((await http(second, `generate-case/status?requestId=${generation.requestId}`)).phase, 'ready');
    const opening = await http(first, 'interrogate', { sessionId, requestId: 'opening-http-01', playerQuestion: '*Detective sits down*' });
    assert.equal(transport.calls(), 0);
    await interruptAndRecover(first, second, sessionId, database, transport);
    console.log('PASS killed production worker: another process recovers the original pending ID and refuses paid replay.');
    const { win, winningInput } = await playEvidence(second, sessionId, opening.gameplay.turns[0].id, transport);
    const countActions = () => database.sql(`SELECT count(*) FROM interrogation_private.game_requests WHERE session_key=${literal(hash(sessionId))};`);
    const beforeReads = await countActions();
    const result = await http(second, 'evaluate', { sessionId, type: 'win' });
    const snapshot = await http(second, `session?sessionId=${sessionId}`);
    assert.equal(await countActions(), beforeReads, 'read/evaluate polls do not consume action receipts');
    assert.equal(snapshot.gameplay.establishedCount, 1);
    assert.deepEqual(result.conversationPath.filter(node => node.kind === 'accusation').map(node => node.status), ['unsupported', 'supported']);
    const submission = { sessionId, winToken: win.winToken, playerName: 'JP' };
    const score = await http(second, 'leaderboard', submission);
    assert.equal(score.success, true); assert.equal(score.score, result.stats.score);
    const third = await startNext(directory, transport); servers.push(third);
    assert.notEqual(third.child.pid, second.child.pid);
    assert.deepEqual(await http(third, 'accuse', winningInput), win);
    assert.deepEqual(await http(third, 'leaderboard', submission), score);
    assert.deepEqual(await http(third, 'evaluate', { sessionId, type: 'win' }), result);
    const restored = await http(third, `session?sessionId=${sessionId}`);
    assert.deepEqual(restored.conversationHistory, snapshot.conversationHistory);
    assert.deepEqual(restored.result.conversationPath, result.conversationPath);
    assert.equal(restored.stats.score, result.stats.score);
    const publicScores = await http(third, 'leaderboard');
    assert.equal(publicScores.leaderboard.length, 1); assert.equal(publicScores.leaderboard[0].score, score.score);
    assert.equal(publicScores.leaderboard[0].session_id, undefined);
    assert.equal(await database.sql('SELECT count(*) FROM public.game_exports;'), '1');
    assert.equal(await database.sql('SELECT count(*) FROM public.leaderboard;'), '1');
    assert.equal(await database.sql(`SELECT record#>>'{token,consumed}' FROM interrogation_private.game_sessions WHERE session_key=${literal(hash(sessionId))};`), 'true');
    console.log('PASS public HTTP: authored case, evidence/replay, wrong/right accusations, exact result/map recovery, single export and score across workers.');
    await assertSharedAdmission(second, third);
    assert.equal(transport.calls(), 5, 'one interrupted suspect, two evidence responses and two judgments only');
    assert.equal(transport.errors.length, 0, transport.errors[0]?.message);
    assert.deepEqual(await readdir(directory), [], 'no worker wrote fallback session, budget or export files');
    console.log('PASS shared HTTP admission: ten alternating-worker submissions admitted; eleventh denied. Reads consume no action IDs; no local fallback files.');
    console.log('Scope: actual Next production HTTP servers and PostgreSQL; Supabase SDK transport bridged via IPC, OpenAI responses controlled. Not live provider, hosted Supabase/PostgREST, Vercel, browser or voice proof.');
    console.log('Fault injection: SIGKILL during held provider response; abandoned SQL lease advanced to test recovery without a three-minute wait.');
  } finally {
    await Promise.allSettled(servers.map(server => server.stop()));
    await database.stop();
    await rm(directory, { recursive: true, force: true });
    console.log('CLEANUP Next worker processes, isolated PostgreSQL and temporary fixture directory removed.');
  }
}
main().catch(error => {
  console.error(String(error.stack ?? error).replace(/[a-f0-9]{32,}/g, '[redacted identifier]'));
  process.exitCode = 1;
});
