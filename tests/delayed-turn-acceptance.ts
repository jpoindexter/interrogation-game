import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash, randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { NextRequest } from 'next/server';
import { POST as interrogate } from '../app/api/interrogate/route';
import { GET as recover } from '../app/api/session/route';
import { createSession } from '../src/lib/session/store';
import { getSessionRepository } from '../src/lib/session/repository';
import { budgetKey } from '../src/lib/limits/repository';
import type { BudgetLedger } from '../src/lib/limits/types';

const facts = { difficulty: 'easy', playMode: 'relaxed', setting: 'office', suspect_name: 'Casey',
  suspect_role: 'Clerk', suspect_cover_story: 'I worked at my desk.', crime: 'A ledger disappeared.',
  suspect_true_story: 'Casey carried the ledger upstairs.', the_truth: 'Casey handled the ledger.',
  the_lie: 'I never handled the ledger.', the_contradiction: 'A signed witness record shows Casey holding it.',
  stress_triggers: ['ledger'], deflection_tactics: ['Ask for the record'] };
const reply = { spoken_response: 'I worked at my desk. Which record are you asking about?',
  internal_state: 'Guarded', stress_level: 1, clue_unlocked: null, caught: false };

function fixtureEnvironment(directory: string) {
  const values: Record<string, string | undefined> = { INTERROGATION_DATA_DIR: directory,
    AI_PROVIDER: 'openai', OPENAI_API_KEY: 'synthetic-delayed-turn-key', OPENAI_MODEL: 'fixture-model',
    AI_TIMEOUT_MS: '45000', AI_WORK_ENABLED: 'true', AI_RAG_ENABLED: 'false', SESSION_STORAGE: 'local',
    LEADERBOARD_STORAGE: 'local', EXPORT_STORAGE: 'local', VERCEL: undefined, AWS_LAMBDA_FUNCTION_NAME: undefined };
  const before = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  const apply = (entries: typeof values) => {
    for (const [key, value] of Object.entries(entries)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  };
  apply(values);
  return () => apply(before);
}

async function aiUsage(directory: string, sessionId: string) {
  const ledger: BudgetLedger = JSON.parse(await readFile(join(directory, 'limits/usage.json'), 'utf8'));
  const entry = ledger.entries[budgetKey('ai', `session:${sessionId}`)];
  assert.ok(entry?.kind === 'ai');
  return { calls: entry.calls, inputCharacters: entry.inputCharacters };
}

function httpBridge() {
  const state = { dropNextTurn: true, dropped: 0, responses: [] as number[] };
  const errors: unknown[] = [];
  async function serve(incoming: IncomingMessage, outgoing: ServerResponse) {
    const chunks: Buffer[] = [];
    for await (const chunk of incoming) chunks.push(Buffer.from(chunk));
    const controller = new AbortController();
    outgoing.on('close', () => { if (!outgoing.writableEnded) controller.abort(); });
    const request = new NextRequest(`http://127.0.0.1${incoming.url}`, {
      method: incoming.method, headers: incoming.headers as HeadersInit, signal: controller.signal,
      ...(incoming.method === 'POST' ? { body: Buffer.concat(chunks) } : {}),
    });
    const response = incoming.method === 'POST' ? await interrogate(request) : await recover(request);
    const bytes = Buffer.from(await response.arrayBuffer());
    state.responses.push(response.status);
    if (incoming.method === 'POST' && state.dropNextTurn) {
      assert.equal(response.status, 200, bytes.toString());
      state.dropNextTurn = false;
      state.dropped++;
      outgoing.destroy(); // The actual route returned only after its accepted receipt was durably saved.
      return;
    }
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(bytes);
  }
  const server = createServer((incoming, outgoing) => {
    void serve(incoming, outgoing).catch(error => { errors.push(error); outgoing.destroy(); });
  });
  return { server, state, errors };
}

test('a normal turn delayed over 15 seconds survives lost delivery with one committed turn and AI reservation', { timeout: 45_000 }, async t => {
  const directory = await mkdtemp(join(tmpdir(), 'interrogation-delayed-turn-'));
  const restore = fixtureEnvironment(directory);
  const bridge = httpBridge();
  t.after(async () => {
    bridge.server.closeAllConnections();
    await new Promise<void>(resolve => bridge.server.close(() => resolve()));
    restore();
    await rm(directory, { recursive: true, force: true });
  });
  const sessionId = createSession(facts, [], 0, 'unlimited');
  const requestId = randomUUID();
  let providerCalls = 0;
  let entered!: () => void;
  const providerEntered = new Promise<void>(resolve => { entered = resolve; });
  let providerDelayMs = 0;
  const originalFetch = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, options?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.href === 'https://api.openai.com/v1/responses') {
      providerCalls++;
      assert.equal(providerCalls, 1, 'receipt recovery must never enter the provider twice');
      const started = performance.now();
      entered();
      await delay(16_000, undefined, { signal: options?.signal ?? undefined });
      providerDelayMs = performance.now() - started;
      return Response.json({ status: 'completed', output: [{ type: 'message',
        content: [{ type: 'output_text', text: JSON.stringify(reply) }] }] });
    }
    assert.equal(url.origin, base, 'unexpected network destination is forbidden');
    return originalFetch(input, options);
  });
  bridge.server.listen(0, '127.0.0.1');
  await once(bridge.server, 'listening');
  const address = bridge.server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const request = { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, requestId, playerQuestion: 'What did you do at the desk that evening?' }),
    signal: AbortSignal.timeout(35_000) };
  const started = performance.now();
  const lost = fetch(`${base}/api/interrogate`, request).then(() => false, () => true);
  await providerEntered;
  const pending = getSessionRepository().load(sessionId)!;
  assert.equal(pending.requests[requestId].state, 'pending');
  assert.equal(pending.session.questionsAsked, 0);
  const reserved = await aiUsage(directory, sessionId);
  assert.equal(reserved.calls, 1);
  assert.ok(reserved.inputCharacters > 0);
  assert.equal(await lost, true, 'the first HTTP client must receive no accepted response');
  const elapsedMs = performance.now() - started;
  assert.ok(providerDelayMs > 15_000 && elapsedMs > 15_000);
  assert.deepEqual(bridge.errors, []);
  const committed = getSessionRepository().load(sessionId)!;
  assert.equal(committed.requests[requestId].state, 'complete');
  assert.equal(committed.session.questionsAsked, 1);
  assert.equal(committed.session.conversationHistory.length, 2);
  assert.equal(Object.keys(committed.requests).length, 1);
  const retry = await fetch(`${base}/api/interrogate`, request);
  assert.equal(retry.status, 200);
  assert.deepEqual(await retry.json(), committed.requests[requestId].response!.body);
  const stateResponse = await fetch(`${base}/api/session?sessionId=${sessionId}`);
  assert.equal(stateResponse.status, 200);
  const recovered = await stateResponse.json();
  assert.equal(recovered.questionsAsked, 1);
  assert.deepEqual(recovered.conversationHistory, committed.session.conversationHistory);
  assert.deepEqual(recovered.pendingRequests, []);
  assert.equal(providerCalls, 1);
  assert.deepEqual(await aiUsage(directory, sessionId), reserved, 'replay/recovery must not reserve AI work again');
  assert.equal(bridge.state.dropped, 1);
  assert.deepEqual(bridge.state.responses, [200, 200, 200]);
  const report = { executedAt: new Date().toISOString(), node: process.version,
    scope: 'Actual route modules over a loopback Node HTTP bridge; actual local filesystem; controlled Responses transport.',
    providerDelayMs: Math.round(providerDelayMs), elapsedUntilLostDeliveryMs: Math.round(elapsedMs),
    acceptedTurns: recovered.questionsAsked, transcriptEntries: recovered.conversationHistory.length,
    providerTransportInvocations: providerCalls, aiReservations: reserved.calls,
    reservedInputCharacters: reserved.inputCharacters, droppedResponses: bridge.state.dropped,
    replayExactlyMatched: true, recoveryExactlyMatched: true, pendingRequestsAfterRecovery: 0,
    billingVerified: false, browserVerified: false, nextProductionServerVerified: false,
    sourceHashes: Object.fromEntries(await Promise.all(['tests/delayed-turn-acceptance.ts',
      'app/api/interrogate/route.ts', 'src/lib/session/request-ledger.ts', 'src/lib/ai/provider.ts'].map(async path =>
      [path, createHash('sha256').update(await readFile(path)).digest('hex')]))),
  };
  if (process.env.DELAYED_TURN_REPORT) await writeFile(process.env.DELAYED_TURN_REPORT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report));
});
