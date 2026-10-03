import test from 'node:test';
import assert from 'node:assert/strict';
import { acknowledgeGeneration, confirmGeneration, getGenerationReceipt, renewGeneration } from '../app/game/state/generation-receipt';
import { loadCaseIntent } from '../app/game/state/load-case-intent';

function memoryStore() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
}
const intent = { difficulty: 'easy', setting: null, mode: null, timerMode: 'countdown' as const };
const validCase = {
  case_number: '1', setting: 'office', crime: 'theft', objective: 'Find the lie', briefing: 'A document disappeared',
  suspect_name: 'Alex', suspect_gender: 'male', suspect_role: 'Clerk', suspect_cover_story: 'I was at home', difficulty: 'easy', sessionId: 'saved-session',
};

test('remounts and equivalent intents retain ID, while mode/timer changes separate requests', () => {
  const store = memoryStore();
  const first = getGenerationReceipt(intent, store);
  assert.deepEqual(getGenerationReceipt({ ...intent, setting: 'random' }, store), first);
  assert.notEqual(getGenerationReceipt({ ...intent, mode: 'redteam' }, store).requestId, first.requestId);
  assert.notEqual(getGenerationReceipt({ ...intent, timerMode: 'unlimited' }, store).requestId, first.requestId);
  renewGeneration(intent, first.requestId, store);
  assert.notEqual(getGenerationReceipt(intent, store).requestId, first.requestId);
});

test('confirmed session receipt remains until the matching recovered URL is observed', () => {
  const store = memoryStore();
  const first = getGenerationReceipt(intent, store);
  confirmGeneration(intent, { ...first, sessionId: 'saved-session' }, store);
  acknowledgeGeneration(intent, 'wrong-session', store);
  assert.equal(getGenerationReceipt(intent, store).sessionId, 'saved-session');
  assert.throws(() => renewGeneration(intent, first.requestId, store));
  acknowledgeGeneration(intent, 'saved-session', store);
  assert.notEqual(getGenerationReceipt(intent, store).requestId, first.requestId);
});

test('unavailable or silently dropped storage fails closed before generation', async context => {
  context.mock.method(globalThis, 'fetch', async () => assert.fail('storage failure sent a generation request'));
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get() { throw new Error('blocked'); } });
  context.after(() => { Reflect.deleteProperty(globalThis, 'sessionStorage'); });
  await assert.rejects(loadCaseIntent(intent, new AbortController().signal), /session storage/);
  assert.doesNotThrow(() => acknowledgeGeneration(intent, 'saved-session'));
  assert.throws(() => getGenerationReceipt(intent, { getItem: () => null, setItem: () => {}, removeItem: () => {} }), /session storage/);
});

test('confirmed creation recovers by session GET on remount instead of issuing another POST', async context => {
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: memoryStore() });
  context.after(() => { Reflect.deleteProperty(globalThis, 'sessionStorage'); });
  const methods: string[] = [];
  context.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    methods.push(init.method ?? 'GET');
    if (url === '/api/generate-case') return Response.json(validCase);
    assert.equal(url, '/api/session?sessionId=saved-session');
    return Response.json({ caseData: validCase, conversationHistory: [], clues: [], timerMode: 'countdown', startedAt: 0,
      status: 'briefing', outcome: null, accusationsLeft: 3, hintsUsed: 0, stressLevel: 0, pendingRequests: [] });
  });
  await loadCaseIntent(intent, new AbortController().signal);
  const recovered = await loadCaseIntent(intent, new AbortController().signal);
  assert.equal(recovered.snapshot?.caseData.sessionId, 'saved-session');
  assert.deepEqual(methods, ['POST', 'GET']);
});

test('network ambiguity replays the same persisted request ID', async context => {
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: memoryStore() });
  context.after(() => { Reflect.deleteProperty(globalThis, 'sessionStorage'); });
  const requests: string[] = [];
  context.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
    requests.push(JSON.parse(String(init.body)).requestId);
    throw new TypeError('Network failure');
  });
  await assert.rejects(loadCaseIntent(intent, new AbortController().signal));
  await assert.rejects(loadCaseIntent(intent, new AbortController().signal));
  assert.equal(requests.length, 2);
  assert.equal(requests[0], requests[1]);
});


test('effect cleanup cancellation and replay preserve a single generation identity', async context => {
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: memoryStore() });
  context.after(() => { Reflect.deleteProperty(globalThis, 'sessionStorage'); });
  const requests: string[] = [];
  context.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
    requests.push(JSON.parse(String(init.body)).requestId);
    if (requests.length === 1) return new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
    });
    return Response.json(validCase);
  });
  const controller = new AbortController();
  const initial = loadCaseIntent(intent, controller.signal);
  controller.abort();
  await assert.rejects(initial);
  await loadCaseIntent(intent, new AbortController().signal);
  assert.equal(requests[0], requests[1]);
});
