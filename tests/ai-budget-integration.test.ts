import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { NextRequest } from 'next/server';
import { OpenAIProvider } from '../src/lib/ai/openai';
import { requestStructured } from '../src/lib/ai/provider';
import { reserveAiWork, withAiWorkScope } from '../src/lib/limits/ai-scope';
import { AI_WORK_LIMITS } from '../src/lib/limits/ai-policy';
import { POST as interrogate } from '../app/api/interrogate/route';
import { getSession, persistSession } from '../src/lib/session/store';
import { readReadiness } from '../src/lib/config/readiness';
import { persistenceFixture } from './session-persistence-fixtures';
import { RequestLedger } from '../app/game/state/request-ledger';
import { requestGameAction } from '../app/game/controller/action-transport';
import { parseTurnResponse } from '../app/game/controller/action-response-validation';
import { runGenerationRequest } from '../src/lib/session/generation-requests';
import { CaseGenerationError } from '../app/game/state/case-loader';
import { embedTexts } from '../src/lib/ai/retrieval/embeddings';
import { EMBEDDING_SPACE } from '../src/lib/ai/retrieval/config';

function environment(t: TestContext, name: string, value: string) {
  const previous = process.env[name];
  process.env[name] = value;
  t.after(() => { if (previous === undefined) delete process.env[name]; else process.env[name] = previous; });
}

const task = { capability: 'suspect' as const, instructions: 'Fictional dialogue', input: 'A question',
  schema: { type: 'object', properties: { answer: { type: 'string' } }, required: ['answer'], additionalProperties: false } };

test('operator stop reaches the real turn route, blocks the adapter and permits a new explicit attempt', async t => {
  const { sessionId, session } = await persistenceFixture(t);
  Object.assign(session.caseData, { suspect_true_story: 'Ada was in the workshop.', stress_triggers: ['A time discrepancy'], deflection_tactics: ['Ask for detail'] });
  persistSession(sessionId);
  environment(t, 'AI_PROVIDER', 'openai');
  environment(t, 'AI_WORK_ENABLED', 'false');
  let calls = 0;
  t.mock.method(OpenAIProvider.prototype, 'generate', async () => {
    calls++;
    return { spoken_response: 'I worked at my desk.', internal_state: 'Guarded', stress_level: 1, clue_unlocked: null, caught: false };
  });
  assert.match(readReadiness().services.ai.detail, /stopped/);
  const request = (requestId: string) => new NextRequest('http://localhost/api/interrogate', { method: 'POST',
    body: JSON.stringify({ sessionId, requestId, playerQuestion: 'Describe your afternoon.' }) });
  const first = await interrogate(request('stopped-request-01'));
  const failure = await first.json();
  assert.equal(first.status, 503);
  assert.equal(failure.code, 'AI_WORK_DISABLED');
  assert.equal(failure.requestComplete, true);
  assert.equal(calls, 0);
  assert.equal(getSession(sessionId)!.questionsAsked, 0);
  process.env.AI_WORK_ENABLED = 'true';
  assert.deepEqual(await (await interrogate(request('stopped-request-01'))).json(), failure);
  assert.equal(calls, 0);
  assert.equal((await interrogate(request('new-enabled-request-02'))).status, 200);
  assert.equal(calls, 1);
  assert.equal(getSession(sessionId)!.questionsAsked, 1);
});

test('the actual provider gateway denies exhausted and oversized inputs before entering an adapter', async t => {
  const { sessionId } = await persistenceFixture(t);
  environment(t, 'AI_PROVIDER', 'openai');
  environment(t, 'AI_WORK_ENABLED', 'true');
  let calls = 0;
  t.mock.method(OpenAIProvider.prototype, 'generate', async () => { calls++; return { answer: 'Accepted' }; });
  await withAiWorkScope(sessionId, async () => {
    assert.deepEqual(await requestStructured(task), { answer: 'Accepted' });
    for (let index = 1; index < AI_WORK_LIMITS.calls; index++) reserveAiWork(task);
    await assert.rejects(requestStructured(task), { code: 'AI_WORK_LIMIT', status: 429 });
  });
  await assert.rejects(requestStructured({ ...task, input: 'x'.repeat(AI_WORK_LIMITS.perCallCharacters + 1) }), { code: 'AI_INPUT_LIMIT', status: 413 });
  assert.equal(calls, 1);
});

test('a completed budget failure advances the client ID only when it matches this receipt', async t => {
  const ledger = new RequestLedger();
  const body = { sessionId: 'fixture', playerQuestion: 'Preserved question' };
  const path = '/api/interrogate';
  const attempt = ledger.begin(path, body);
  let matching = false;
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'AI work is stopped.', code: 'AI_WORK_DISABLED',
    requestComplete: true, requestId: matching ? attempt.id : 'another-request' }, { status: 503 }));
  const send = () => requestGameAction({ path, body, attempt, signal: new AbortController().signal, parse: parseTurnResponse });
  await assert.rejects(send());
  assert.equal(ledger.begin(path, body).id, attempt.id);
  matching = true;
  await assert.rejects(send());
  assert.notEqual(ledger.begin(path, body).id, attempt.id);
});

test('generation work denial is a stable failed receipt with no case and an explicit new-attempt path', async t => {
  await persistenceFixture(t);
  environment(t, 'AI_WORK_ENABLED', 'false');
  const requestId = 'generation-stopped-budget';
  let reserved = '';
  const generate = async (context: { sessionId: string }) => { reserved = context.sessionId; await requestStructured(task); return {}; };
  const failure = await runGenerationRequest({ requestId, fingerprint: {}, generate });
  assert.equal(failure.status, 503);
  assert.equal(failure.body.code, 'AI_WORK_DISABLED');
  assert.equal(getSession(reserved), null);
  process.env.AI_WORK_ENABLED = 'true';
  assert.deepEqual(await runGenerationRequest({ requestId, fingerprint: {}, generate }), failure);
  assert.equal(new CaseGenerationError('Stopped', String(failure.body.code), requestId).requiresNewAttempt, true);
});

test('optional embeddings obey the same operator stop and aggregate reservation before fetch', async t => {
  const { sessionId } = await persistenceFixture(t);
  environment(t, 'AI_WORK_ENABLED', 'false');
  const env = { AI_RAG_ENABLED: 'true', OPENAI_API_KEY: 'synthetic-test-key', RAG_EMBEDDING_VERSION: EMBEDDING_SPACE.version };
  let calls = 0;
  const options = { env, fetcher: async () => { calls++; throw new Error('Unexpected network'); } };
  await assert.rejects(embedTexts(['Question'], options), { code: 'AI_WORK_DISABLED' });
  process.env.AI_WORK_ENABLED = 'true';
  await withAiWorkScope(sessionId, async () => {
    for (let index = 0; index < AI_WORK_LIMITS.calls; index++) reserveAiWork(task);
    await assert.rejects(embedTexts(['Question'], options), { code: 'AI_WORK_LIMIT' });
  });
  assert.equal(calls, 0);
});
