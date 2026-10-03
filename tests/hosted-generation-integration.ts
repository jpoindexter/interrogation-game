import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { isolatedPostgres, json, literal } from './hosted-storage-postgres-cluster.mjs';
import { HostedGenerationStorage } from '../src/lib/storage/hosted/generation';
import { runHostedGeneration, type HostedGenerationStores } from '../src/lib/storage/hosted/generate-case';
import { HostedSessionStorage } from '../src/lib/storage/hosted/session';
import type { HostedRpc } from '../src/lib/storage/hosted/rpc';
import { HostedStorageError } from '../src/lib/storage/hosted/rpc';
import { parseGenerationOptions } from '../src/lib/session/generate-case';
import { hashKey } from '../src/lib/storage/hosted/contracts';
import { authoredCaseData } from '../src/lib/gameplay/session';
import { CASE_SCHEMA } from '../src/lib/ai/schemas';
import { passingReview, referencedReviewFixture } from './generated-review-fixtures';
import { parseHostedSessionRecord } from '../src/lib/storage/hosted/validate-session';
import { HostedWorkStorage } from '../src/lib/storage/hosted/budget';
import { HostedRedemptionStorage } from '../src/lib/storage/hosted/redemption';
import { runHostedSessionRequest } from '../src/lib/storage/hosted/action';
import { beginSession } from '../src/lib/session/transitions';
import { judgeAccusation } from '../src/lib/session/accusation';
import { requestStructured } from '../src/lib/ai/provider';
import { JUDGE_SCHEMA } from '../src/lib/ai/schemas';

async function main() {
  const database = await isolatedPostgres();
  const previousFetch = globalThis.fetch;
  let calls = 0;
  try {
    for (const migration of ['001_private_leaderboard', '004_leaderboard_play_mode', '006_hosted_sessions',
      '007_hosted_budgets', '008_hosted_terminal_export', '009_hosted_claimed_work',
      '010_hosted_redemption', '011_hosted_generation', '012_hosted_generation_finish', '015_hosted_request_identity']) {
      await database.migrate(`database/migrations/${migration}.sql`);
    }
    Object.assign(process.env, { SESSION_STORAGE: 'unsupported-fixture', VERCEL: '1', AI_PROVIDER: 'openai',
      OPENAI_API_KEY: 'synthetic-no-network-key', AI_RAG_ENABLED: 'false', AI_WORK_ENABLED: 'true' });
    const rpc: HostedRpc = async (name, args) => {
      assert.match(name, /^interrogation_[a-z_]+$/);
      return database.rpc(name, Object.entries(args).map(([key, value]) => {
        assert.match(key, /^p_[a-z_]+$/);
        return `${key} => ${value === null ? 'NULL' : typeof value === 'object' ? json(value)
          : typeof value === 'number' ? String(value) : literal(value)}`;
      }));
    };
    const stores = (transport = rpc): HostedGenerationStores => ({ generations: new HostedGenerationStorage(transport),
      deployment: 'generation-integration', policy: { sessionCalls: 3, sessionUnits: 500_000,
        deploymentCalls: 10, deploymentUnits: 1_000_000, windowSeconds: 3600 } });
    const generated = parseGenerationOptions({ setting: 'bank', difficulty: 'easy', playMode: 'challenge' });
    const authored = parseGenerationOptions({ mode: 'redteam', playMode: 'challenge' });
    const run = (requestId: string, options = generated, transport = rpc) => runHostedGeneration({ requestId, options,
      request: new NextRequest('http://localhost/api/generate-case', { method: 'POST' }) }, stores(transport));
    const candidate: Record<string, unknown> = { ...authoredCaseData(), objective: 'Identify the false claim',
      detective_leads: ['Check times', 'Check names', 'Check records'], verbal_tics: 'Pauses briefly.' };
    const phases: string[] = [];
    globalThis.fetch = async (url, init) => {
      assert.equal(new URL(String(url)).origin, 'https://api.openai.com');
      calls++;
      const body = JSON.parse(String(init?.body));
      phases.push((await stores().generations.status('generated-lost-response'))!.phase);
      const output = body.text.format.name === 'interrogation_case-review'
        ? referencedReviewFixture(passingReview(candidate), candidate)
        : Object.fromEntries(Object.keys(CASE_SCHEMA.properties).map(key => [key, candidate[key]]));
      return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(output) }] }] });
    };
    const dropFinish: HostedRpc = async (name, args) => {
      const result = await rpc(name, args);
      if (name === 'interrogation_generation_finish') throw new HostedStorageError('STORAGE_UNAVAILABLE');
      return result;
    };
    assert.equal((await run('generated-lost-response', generated, dropFinish)).status, 503);
    const recovered = await run('generated-lost-response');
    assert.equal(recovered.status, 200); assert.equal(calls, 2);
    assert.deepEqual(phases, ['generating', 'reviewing'], 'progress is confirmed before each provider call');
    assert.deepEqual(await run('generated-lost-response'), recovered);
    const record = parseHostedSessionRecord((await new HostedSessionStorage(rpc).load(String(recovered.body.sessionId)))!);
    assert.equal(record.session.status, 'briefing'); assert.equal(record.session.startTime, 0);
    assert.equal(record.session.caseProvenance?.length, 2);
    assert.equal(recovered.body.the_truth, undefined); assert.equal(recovered.body.the_lie, undefined);
    const status = await stores().generations.status('generated-lost-response');
    assert.deepEqual(Object.keys(status!).sort(), ['phase', 'startedAt', 'state']);
    assert.equal(status?.phase, 'ready');
    assert.equal((await run('generated-lost-response', authored)).status, 409);

    const sessionId = String(recovered.body.sessionId);
    const actionStores = { sessions: new HostedSessionStorage(rpc), work: new HostedWorkStorage(rpc),
      deployment: stores().deployment, policy: stores().policy };
    const begin = await runHostedSessionRequest({ sessionId, requestId: 'shared-begin-01', fingerprint: { action: 'begin' },
      run: async session => { beginSession(session); return { status: 200, body: { started: true } }; } }, actionStores);
    assert.equal(begin.status, 200);
    globalThis.fetch = async url => {
      assert.equal(new URL(String(url)).origin, 'https://api.openai.com'); calls++;
      return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text',
        text: JSON.stringify({ correct: true, confession: 'I returned.', explanation: 'Controlled judgment.' }) }] }] });
    };
    const judge = () => requestStructured({ capability: 'judge', instructions: 'Fixture', input: 'Fixture accusation', schema: JUDGE_SCHEMA });
    const win = await runHostedSessionRequest({ sessionId, requestId: 'shared-accuse-01', fingerprint: { action: 'accuse' },
      run: async session => ({ status: 200, body: await judgeAccusation(session, 'You returned after leaving.', judge) }) }, actionStores);
    assert.equal(win.status, 200); assert.equal(win.body.correct, true); assert.equal(calls, 3);
    const submission = { sessionId, winToken: win.body.winToken, playerName: 'JP' };
    const redeemed = await new HostedRedemptionStorage(rpc).redeem(submission);
    assert.equal(redeemed.kind, 'redeemed');
    const replay = await new HostedRedemptionStorage(rpc).redeem(submission);
    assert.equal(replay.kind, 'replay');
    if (redeemed.kind === 'redeemed' && replay.kind === 'replay') assert.deepEqual(redeemed.receipt, replay.receipt);
    const spent = await runHostedSessionRequest({ sessionId, requestId: 'shared-cap-check', fingerprint: { action: 'cap-check' },
      run: async () => { await judge(); return { status: 200, body: {} }; } }, actionStores);
    assert.equal(spent.status, 429); assert.equal(calls, 3, 'generation and gameplay share one lifetime allowance');
    const terminal = parseHostedSessionRecord((await actionStores.sessions.load(sessionId))!);
    assert.equal(terminal.token?.consumed, true); assert.equal(terminal.session.outcome, 'win');
    assert.equal(await database.sql('SELECT count(*) FROM public.game_exports;'), '1');
    assert.equal(await database.sql('SELECT count(*) FROM public.leaderboard;'), '1');

    const dropCheckpoint: HostedRpc = async (name, args) => {
      const result = await rpc(name, args);
      if (name === 'interrogation_generation_write' && args.p_checkpoint) throw new HostedStorageError('STORAGE_UNAVAILABLE');
      return result;
    };
    assert.equal((await run('authored-checkpoint-recovery', authored, dropCheckpoint)).status, 503);
    const expire = (id: string) => database.sql(`UPDATE interrogation_private.game_generation_requests
      SET lease_until=clock_timestamp()-interval '1 second' WHERE request_key=${literal(hashKey(id))};`);
    await expire('authored-checkpoint-recovery');
    globalThis.fetch = async () => { throw Error('Recovery must not infer'); };
    const resumed = await run('authored-checkpoint-recovery', authored);
    assert.equal(resumed.status, 200); assert.ok(resumed.body.gameplay); assert.equal(calls, 3);
    assert.deepEqual(await run('authored-checkpoint-recovery', authored), resumed);
    assert.equal(await database.sql('SELECT count(*) FROM interrogation_private.game_sessions;'), '2');
    console.log('PASS real shared generation: awaited draft/review phases, controlled AI gateway, validated briefing and private projection');
    console.log('PASS lost completion response replays exactly; uncertain checkpoint recovers without inference or duplicate session');
    console.log('PASS generated session begins, wins, exports and redeems once; generation/gameplay share allowance and consumed grant survives later result commit');
    console.log('Scope: real TypeScript generation/domain/adapters and isolated PostgreSQL; controlled OpenAI HTTP. No public HTTP route selection, live API, browser, voice or deployed Supabase proof.');
  } finally {
    globalThis.fetch = previousFetch;
    await database.stop();
    console.log('CLEANUP isolated PostgreSQL removed');
  }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
