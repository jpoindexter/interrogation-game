import assert from 'node:assert/strict';
import test from 'node:test';
import { CaseGenerationError, loadCase, parsePublicCase } from '../app/game/state/case-loader';

const validCase = {
  case_number: '1', setting: 'office', crime: 'theft', objective: 'Find the lie',
  briefing: 'A document disappeared', suspect_name: 'Alex', suspect_gender: 'male',
  suspect_role: 'Clerk', suspect_cover_story: 'I was at home', difficulty: 'easy', sessionId: 'test-session',
};
const options = { difficulty: 'easy', setting: null, timerMode: 'countdown' as const, requestId: 'test-request-id' };

test('optional case controls are validated and unknown/private fields never enter client state', () => {
  for (const mutation of [{ startedAt: -1 }, { startedAt: Infinity }, { startedAt: 1.5 },
    { requiredClues: 0 }, { requiredClues: 6 }, { portraitId: '../../private' }, { gameplay: null },
    { playMode: 'relaxed', timerMode: 'countdown' }, { timerMode: 'forever' }, { mode: 'unknown' },
    { detective_leads: [''] }]) assert.throws(() => parsePublicCase({ ...validCase, ...mutation }));
  const parsed = parsePublicCase({ ...validCase, the_truth: 'private', stress_triggers: ['secret'],
    unknownAuthority: true, playMode: 'relaxed', timerMode: 'unlimited', startedAt: 0, requiredClues: 1, portraitId: '11-m' });
  assert.deepEqual(parsed, { ...validCase, playMode: 'relaxed', timerMode: 'unlimited', startedAt: 0, requiredClues: 1, portraitId: '11-m' });
});

void test('HTTP error payloads never enter the case state and preserve status/code', async context => {
  context.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'unavailable', code: 'STORAGE_UNAVAILABLE' }, { status: 503 }));
  await assert.rejects(loadCase({ ...options, signal: new AbortController().signal }), (error: unknown) => {
    assert.ok(error instanceof CaseGenerationError);
    assert.match(error.message, /HTTP 503/);
    assert.equal(error.code, 'STORAGE_UNAVAILABLE');
    assert.equal(error.requiresNewAttempt, false);
    return true;
  });
});

void test('invalid cases are rejected even when the server returns success', () => {
  assert.throws(() => parsePublicCase({ error: 'failed' }), /incomplete/);
  assert.throws(() => parsePublicCase({ ...validCase, briefing: ' ' }), /incomplete/);
  assert.throws(() => parsePublicCase({ ...validCase, difficulty: 'arbitrary' }), /difficulty/);
  assert.throws(() => parsePublicCase({ ...validCase, detective_leads: [42] }), /leads/);
  assert.deepEqual(parsePublicCase(validCase), validCase);
});

void test('case creation POST contains its stable identity, options and cancellation', async context => {
  const controller = new AbortController();
  context.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    assert.equal(url, '/api/generate-case');
    assert.equal(init.method, 'POST');
    assert.deepEqual(JSON.parse(String(init.body)), { requestId: options.requestId, difficulty: 'easy', timerMode: 'unlimited', mode: 'redteam', playMode: 'relaxed' });
    assert.equal(init.signal?.aborted, true);
    throw init.signal?.reason;
  });
  controller.abort();
  await assert.rejects(loadCase({ ...options, mode: 'redteam', timerMode: 'unlimited', signal: controller.signal }));
});

void test('generation transport deadline is 210 seconds and known failures require manual new attempt', async context => {
  const timeout = AbortSignal.timeout.bind(AbortSignal);
  context.mock.method(AbortSignal, 'timeout', (duration: number) => { assert.equal(duration, 210_000); return timeout(duration); });
  context.mock.method(globalThis, 'fetch', async () => Response.json(validCase));
  assert.deepEqual(await loadCase({ ...options, signal: new AbortController().signal }), validCase);
  for (const code of ['ACTION_FAILED', 'REQUEST_INTERRUPTED', 'GENERATION_INTERRUPTED', 'GENERATION_EXPIRED', 'REQUEST_CONFLICT']) {
    assert.equal(new CaseGenerationError('failed', code, options.requestId).requiresNewAttempt, true);
  }
  for (const code of ['ACTION_IN_PROGRESS', 'GENERATION_IN_PROGRESS', 'STORAGE_UNAVAILABLE', 'GENERATION_LIMIT', null]) {
    assert.equal(new CaseGenerationError('uncertain', code, options.requestId).requiresNewAttempt, false);
  }
});


test('non-JSON HTTP failures retain HTTP status and same-request recovery', async context => {
  context.mock.method(globalThis, 'fetch', async () => new Response('Unavailable', { status: 502 }));
  await assert.rejects(loadCase({ ...options, signal: new AbortController().signal }), (error: unknown) => {
    assert.ok(error instanceof CaseGenerationError);
    assert.match(error.message, /HTTP 502/);
    assert.equal(error.requiresNewAttempt, false);
    return true;
  });
});
