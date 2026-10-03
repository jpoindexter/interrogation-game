import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextRequest } from 'next/server';
import { POST as generateCase } from '../app/api/generate-case/route';
import { loadCaseIntent } from '../app/game/state/load-case-intent';
import { CaseGenerationError } from '../app/game/state/case-loader';
import { getGenerationReceipt } from '../app/game/state/generation-receipt';
import CasePreparationError from '../app/game/components/CasePreparationError';
import BriefingScreen from '../app/game/components/BriefingScreen';
import { GenerationStore, generationDirectory } from '../src/lib/session/generation-store';
import { getSession } from '../src/lib/session/store';
import { generationFixture } from './generation-fixtures';

const intent = { difficulty: 'easy', setting: 'startup', timerMode: 'unlimited' as const };
const output = (text: string) => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text }] }] });
const failures = [
  { name: 'upstream HTTP 500', response: () => Response.json({ error: 'Synthetic upstream failure' }, { status: 500 }) },
  { name: 'upstream HTTP 429', response: () => Response.json({ error: 'Synthetic upstream limit' }, { status: 429 }) },
  { name: 'upstream invalid JSON', response: () => new Response('not JSON') },
  { name: 'upstream missing fields', response: () => output('{}') },
  { name: 'upstream refusal', response: () => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'Synthetic refusal' }] }] }) },
];

function installEnvironment(t: TestContext) {
  const values: Record<string, string | undefined> = { AI_PROVIDER: 'openai', OPENAI_API_KEY: 'synthetic-generation-matrix',
    OPENAI_MODEL: 'fixture-model', AI_RAG_ENABLED: 'false', SESSION_STORAGE: 'local', EXPORT_STORAGE: 'local',
    LEADERBOARD_STORAGE: 'local', AI_WORK_ENABLED: 'true', VERCEL: undefined, AWS_LAMBDA_FUNCTION_NAME: undefined };
  const before = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  const apply = (entries: typeof values) => {
    for (const [key, value] of Object.entries(entries)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  };
  apply(values);
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  t.after(() => {
    apply(before);
    if (previous) Object.defineProperty(globalThis, 'sessionStorage', previous);
    else Reflect.deleteProperty(globalThis, 'sessionStorage');
  });
}

test('real generation route failures render recovery and permit authored practice without a partial session', async t => {
  installEnvironment(t);
  let providerCalls = 0, upstreamStatus = 0, scenario = failures[0];
  const routeStatuses: number[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    if (url === '/api/generate-case') {
      const response = await generateCase(new NextRequest('http://localhost/api/generate-case', {
        ...init, signal: init.signal ?? undefined,
        headers: { 'Content-Type': 'application/json' },
      }));
      routeStatuses.push(response.status);
      return response;
    }
    assert.equal(url, 'https://api.openai.com/v1/responses', 'Unexpected network destination');
    providerCalls++;
    const response = scenario.response();
    upstreamStatus = response.status;
    return response;
  });
  for (const current of failures) await t.test(current.name, async sub => {
    await generationFixture(sub);
    scenario = current;
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    } });
    const before = providerCalls;
    const run = () => loadCaseIntent(intent, new AbortController().signal);
    const failure = await run().then(() => assert.fail('Failed generation resolved'), error => error);
    assert.ok(failure instanceof CaseGenerationError);
    assert.equal(failure.requiresNewAttempt, true);
    const receipt = getGenerationReceipt(intent);
    assert.equal(receipt.sessionId, undefined);
    const serverReceipt = new GenerationStore(generationDirectory(), receipt.requestId).load();
    assert.equal(serverReceipt?.state, 'complete');
    assert.ok(serverReceipt?.sessionId);
    assert.equal(getSession(serverReceipt.sessionId), null, 'No partial playable session');
    assert.equal(providerCalls, before + 1);
    const html = renderToStaticMarkup(<CasePreparationError message={failure.message} code={failure.code}
      retry={() => {}} retryLabel="Start new attempt" />);
    assert.match(html, /role="alert"/);
    assert.match(html, /Start new attempt/);
    assert.match(html, /href="\/game\?mode=redteam&amp;difficulty=easy"/);
    assert.doesNotMatch(html, /Synthetic upstream|Synthetic refusal/);
    await assert.rejects(run(), { message: failure.message });
    assert.equal(providerCalls, before + 1, 'Failed receipt replays without more inference');
    const practice = await loadCaseIntent({ ...intent, mode: 'redteam', setting: null }, new AbortController().signal);
    const session = getSession(practice.data.sessionId)!;
    assert.equal(session.status, 'briefing');
    assert.equal(session.accusationsLeft, 3);
    assert.equal(session.questionsAsked, 0);
    assert.equal(session.startTime, 0);
    assert.equal(providerCalls, before + 1, 'Authored preparation makes no model call');
    const briefing = renderToStaticMarkup(<BriefingScreen caseData={practice.data} difficulty="easy" onStart={() => {}} onBack={() => {}} />);
    assert.ok(briefing.includes(practice.data.suspect_name));
    assert.doesNotMatch(briefing, /Case preparation interrupted/);
    t.diagnostic(`${scenario.name}: upstream ${upstreamStatus}; route ${routeStatuses.at(-3)}; durable failure replay; no partial session; authored practice renders with three attempts and clock not started.`);
  });
});
