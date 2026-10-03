import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isolatedPostgres, json, literal } from './hosted-storage-postgres-cluster.mjs';
import { createSession, getSessionRecord, getSession } from '../src/lib/session/store';
import { authoredCaseData } from '../src/lib/gameplay/session';
import { beginSession } from '../src/lib/session/transitions';
import { commitTurn } from '../src/lib/session/turn';
import { judgeAccusation } from '../src/lib/session/accusation';
import { projectResult } from '../src/lib/session/result';
import { requestStructured } from '../src/lib/ai/provider';
import { JUDGE_SCHEMA } from '../src/lib/ai/schemas';
import { runHostedSessionRequest, type HostedActionStores } from '../src/lib/storage/hosted/action';
import { HostedSessionStorage } from '../src/lib/storage/hosted/session';
import { HostedWorkStorage } from '../src/lib/storage/hosted/budget';
import { parseHostedSessionRecord } from '../src/lib/storage/hosted/validate-session';
import { withSessionWorkspace } from '../src/lib/session/workspace';
import type { HostedRpc } from '../src/lib/storage/hosted/rpc';
import type { GameSession } from '../src/lib/session/types';

async function main() {
const database = await isolatedPostgres();
const directory = await mkdtemp(join(tmpdir(), 'hosted-action-seed-'));
const originalFetch = globalThis.fetch;
let providerCalls = 0;
try {
  for (const file of ['001_private_leaderboard', '004_leaderboard_play_mode', '006_hosted_sessions',
    '007_hosted_budgets', '008_hosted_terminal_export', '009_hosted_claimed_work']) {
    await database.migrate(`database/migrations/${file}.sql`);
  }
  process.env.INTERROGATION_DATA_DIR = directory;
  process.env.SESSION_STORAGE = 'local';
  process.env.VERCEL = '';
  const caseData = authoredCaseData(); delete caseData.mode; delete caseData.requiredClues;
  const sessionId = createSession({ ...caseData, playMode: 'challenge' });
  const seed = structuredClone(getSessionRecord(sessionId)!);
  // Any accidental local persistence/read during shared orchestration must now fail.
  process.env.SESSION_STORAGE = 'unsupported-fixture'; process.env.VERCEL = '1';
  process.env.AI_PROVIDER = 'openai'; process.env.OPENAI_API_KEY = 'synthetic-no-network-key';
  process.env.AI_WORK_ENABLED = 'true';
  let correct = false;
  globalThis.fetch = async input => {
    assert.equal(new URL(String(input)).origin, 'https://api.openai.com');
    providerCalls++;
    return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text',
      text: JSON.stringify({ correct, confession: correct ? 'I returned.' : 'That is not right.', explanation: 'Fixture judgment.' }) }] }] });
  };
  const rpc: HostedRpc = async (name, args) => {
    assert.match(name, /^interrogation_[a-z_]+$/);
    const parameters = Object.entries(args).map(([key, value]) => {
      assert.match(key, /^p_[a-z_]+$/);
      const sqlValue = value === null ? 'NULL' : typeof value === 'object' ? json(value)
        : typeof value === 'number' ? String(value) : literal(value);
      return `${key} => ${sqlValue}`;
    });
    return database.rpc(name, parameters);
  };
  const stores: HostedActionStores = { sessions: new HostedSessionStorage(rpc), work: new HostedWorkStorage(rpc),
    deployment: 'orchestration', policy: { sessionCalls: 2, sessionUnits: 100_000, deploymentCalls: 2,
      deploymentUnits: 100_000, windowSeconds: 3600 } };
  assert.equal((await stores.sessions.create({ ...seed, requests: {}, session: { ...seed.session } })).kind, 'created');
  const act = (requestId: string, run: (session: GameSession) => Promise<{ status: number; body: Record<string, unknown> }>) =>
    runHostedSessionRequest({ sessionId, requestId, fingerprint: { action: requestId }, run }, stores);
  const started = await act('begin-0001', async session => {
    assert.equal(getSession(sessionId), session, 'domain reads use the claimed workspace');
    assert.equal(getSession('b'.repeat(48)), null, 'workspace cannot read another session from local fallback');
    beginSession(session); return { status: 200, body: { started: true } };
  });
  assert.equal(started.status, 200);
  const question = await act('question-0001', async session => ({ status: 200,
    body: commitTurn(session, 'When did you return to the office?', { spoken_response: 'I left at six.', stress_level: 1, clue_unlocked: null }) }));
  assert.equal(question.status, 200);
  const judge = () => requestStructured({ capability: 'judge', instructions: 'Fixture', input: 'Fixture accusation', schema: JUDGE_SCHEMA });
  const wrong = await act('accuse-wrong-1', async session => ({ status: 200, body: await judgeAccusation(session, 'The wrong claim.', judge) }));
  assert.equal(wrong.status, 200); assert.equal(wrong.body.correct, false);
  correct = true;
  const win = await act('accuse-right-1', async session => ({ status: 200, body: await judgeAccusation(session, 'You returned after leaving.', judge) }));
  assert.equal(win.status, 200); assert.equal(win.body.correct, true);
  assert.equal(providerCalls, 2);
  assert.deepEqual(await act('accuse-right-1', async () => { throw Error('Replay must not execute'); }), win);
  const restored = parseHostedSessionRecord((await new HostedSessionStorage(rpc).load(sessionId))!);
  restored.requests = await stores.sessions.receipts(sessionId);
  const result = withSessionWorkspace({ record: restored }, () => projectResult(restored.session));
  const map = result.conversationPath as { kind: string; status: string }[];
  assert.deepEqual(map.filter(node => node.kind === 'accusation').map(node => node.status), ['unsupported', 'supported']);
  assert.equal(restored.session.outcome, 'win'); assert.ok(restored.token);
  assert.equal(await database.sql('SELECT count(*) FROM public.game_exports;'), '1');
  const denied = await act('over-budget-1', async () => { await judge(); return { status: 200, body: {} }; });
  assert.equal(denied.status, 429); assert.equal(providerCalls, 2, 'quota denial precedes actual AI adapter fetch');
  console.log('PASS shared orchestration: begin, question, wrong/right judged accusation, canonical win/token/export, exact replay and recovered verdict map');
  console.log('PASS workspace has no local fallback; claim-bound allowance admits two controlled AI calls and denies a third before provider');
  console.log('Scope: actual TS domain/orchestration/adapters and PostgreSQL via independent psql connections; controlled OpenAI HTTP. Not HTTP route selection, live OpenAI/Supabase/Vercel/browser/voice proof.');
} finally {
  globalThis.fetch = originalFetch;
  await database.stop(); await rm(directory, { recursive: true, force: true });
  console.log('CLEANUP isolated database and local seed directory removed');
}

}
void main().catch(error => { console.error(error); process.exitCode = 1; });
