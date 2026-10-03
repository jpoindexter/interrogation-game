import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadCaseIntent } from '../app/game/state/load-case-intent';
import { CaseGenerationError } from '../app/game/state/case-loader';
import { getGenerationReceipt, renewGeneration } from '../app/game/state/generation-receipt';
import CasePreparationError from '../app/game/components/CasePreparationError';
import BriefingScreen from '../app/game/components/BriefingScreen';

const intent = { difficulty: 'easy', setting: 'startup', timerMode: 'unlimited' as const };
const validCase = { case_number: '42', setting: 'startup', crime: 'A ledger disappeared.',
  objective: 'Find the false alibi.', briefing: 'Review the visitor record.', suspect_name: 'Casey',
  suspect_gender: 'male', suspect_role: 'Clerk', suspect_cover_story: 'I left at six.',
  difficulty: 'easy', sessionId: 'saved-fixture-session', timerMode: 'unlimited', playMode: 'relaxed' };
const failures = [
  { name: 'HTTP 500', response: () => Response.json({ error: 'Case service unavailable.' }, { status: 500 }), fresh: false },
  { name: 'HTTP 429', response: () => Response.json({ error: 'Please wait before retrying.', code: 'RATE_LIMITED' }, { status: 429 }), fresh: false },
  { name: 'invalid JSON', response: () => new Response('not JSON', { status: 200 }), fresh: false },
  { name: 'missing fields', response: () => Response.json({ case_number: '42', briefing: 'Partial case.' }), fresh: false },
  { name: 'refusal envelope', response: () => Response.json({ error: 'Case preparation could not be completed. No playable case was saved.', code: 'ACTION_FAILED' }, { status: 502 }), fresh: true },
];

function memoryStore() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); } };
}

test('five case failures retain the preparation intent and render recovery before a valid briefing', async t => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'sessionStorage', previous);
    else Reflect.deleteProperty(globalThis, 'sessionStorage');
  });
  let reply = () => Response.json(validCase);
  const sent: Record<string, unknown>[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    assert.equal(url, '/api/generate-case', 'No external or provider request is allowed');
    sent.push(JSON.parse(String(init.body)));
    return reply();
  });
  for (const scenario of failures) {
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: memoryStore() });
    sent.length = 0;
    reply = scenario.response;
    let accepted = 0;
    const request = () => loadCaseIntent(intent, new AbortController().signal).then(result => { accepted++; return result; });
    const failure = await request().then(() => assert.fail('Invalid case reached briefing'), error => error as Error);
    assert.equal(accepted, 0);
    const receipt = getGenerationReceipt(intent);
    assert.equal(receipt.sessionId, undefined, scenario.name);
    assert.equal(receipt.requestId, sent[0].requestId);
    const fresh = failure instanceof CaseGenerationError && failure.requiresNewAttempt;
    assert.equal(fresh, scenario.fresh, scenario.name);
    const retry = async () => {
      if (fresh) renewGeneration(intent, receipt.requestId);
      return request();
    };
    const html = renderToStaticMarkup(<CasePreparationError message={failure.message}
      code={failure instanceof CaseGenerationError ? failure.code : null}
      retry={() => { void retry(); }} retryLabel={fresh ? 'Start new attempt' : 'Retry same request'} />);
    assert.match(html, /role="alert"/);
    assert.ok(html.includes(fresh ? 'Start new attempt' : 'Retry same request'), scenario.name);
    assert.match(html, /Start evidence practice/);
    assert.match(html, /Back to cases/);
    assert.doesNotMatch(html, /Partial case\.|Find the false alibi\./);
    reply = () => Response.json(validCase);
    const recovered = await retry();
    assert.equal(accepted, 1, scenario.name);
    assert.equal(sent.length, 2, 'No automatic retry');
    assert.equal(sent[1].requestId === sent[0].requestId, !fresh, scenario.name);
    assert.equal(sent[1].setting, 'startup');
    assert.equal(sent[1].difficulty, 'easy');
    assert.equal(sent[1].playMode, 'relaxed');
    assert.equal(getGenerationReceipt(intent).sessionId, validCase.sessionId);
    const briefing = renderToStaticMarkup(<BriefingScreen caseData={recovered.data} difficulty="easy" onStart={() => {}} onBack={() => {}} />);
    assert.match(briefing, /Casey/);
    assert.match(briefing, /Find the false alibi/);
    assert.doesNotMatch(briefing, /Case preparation interrupted/);
    t.diagnostic(`${scenario.name}: no accepted case on failure; explicit ${fresh ? 'new attempt' : 'same-ID retry'}; one valid briefing.`);
  }
});
