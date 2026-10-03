import { OpenAIProvider } from '../src/lib/ai/openai';
import { POST as interrogate } from '../app/api/interrogate/route';
import { getSession } from '../src/lib/session/store';
import { persistenceFixture } from './session-persistence-fixtures';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { POST as generate } from '../app/api/generate-case/route';
import { POST as speak } from '../app/api/tts/route';
import { GET as leaderboard } from '../app/api/leaderboard/route';

test('HTTP distinguishes exhausted budget from unavailable storage before provider work', async () => {
  const previous = process.env.INTERROGATION_DATA_DIR;
  const directory = mkdtempSync(join(tmpdir(), 'budget-http-'));
  process.env.INTERROGATION_DATA_DIR = directory;
  const request = () => new NextRequest('http://localhost/api/generate-case', { method: 'POST', body: 'not-json' });
  try {
    for (let index = 0; index < 10; index++) assert.equal((await generate(request())).status, 400);
    const exhausted = await generate(request());
    assert.equal(exhausted.status, 429);
    assert.equal(exhausted.headers.get('Retry-After'), '60');
    assert.equal((await exhausted.json()).code, 'RATE_LIMITED');
    const file = join(directory, 'not-a-directory');
    writeFileSync(file, 'unavailable');
    process.env.INTERROGATION_DATA_DIR = file;
    for (const response of [await generate(request()),
      await speak(new NextRequest('http://localhost/api/tts', { method: 'POST', body: '{}' })),
      await leaderboard(new NextRequest('http://localhost/api/leaderboard'))]) {
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), {
        error: 'Request budget storage is unavailable. Retry the same request shortly.', code: 'BUDGET_UNAVAILABLE',
      });
    }
  } finally {
    if (previous === undefined) delete process.env.INTERROGATION_DATA_DIR;
    else process.env.INTERROGATION_DATA_DIR = previous;
    rmSync(directory, { recursive: true, force: true });
  }
});


test('headerless question retries share one restrictive bucket without consuming leaderboard quota, and denial precedes provider entry', async t => {
  const { sessionId } = await persistenceFixture(t);
  const env = { AI_PROVIDER: 'openai', AI_WORK_ENABLED: 'true', LEADERBOARD_STORAGE: 'local' };
  const previous = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  Object.assign(process.env, env);
  t.after(() => { for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  } });
  const now = Date.now();
  t.mock.method(Date, 'now', () => now); // Exercise one window without elapsed test time refilling it.
  let providerCalls = 0;
  t.mock.method(OpenAIProvider.prototype, 'generate', async () => {
    providerCalls++;
    return { spoken_response: 'I stand by my account.', internal_state: 'Guarded', stress_level: 0, clue_unlocked: null, caught: false };
  });
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected external request'); });
  const question = (requestId: string, headers?: HeadersInit) => new NextRequest('http://localhost/api/interrogate', {
    method: 'POST', headers, body: JSON.stringify({ sessionId, requestId, playerQuestion: 'Describe your afternoon in the office.' }),
  });
  const first = await interrogate(question('shared-question-receipt'));
  assert.equal(first.status, 200);
  const accepted = await first.json();
  for (let index = 1; index < 30; index++) {
    const replay = await interrogate(question('shared-question-receipt'));
    assert.equal(replay.status, 200); assert.deepEqual(await replay.json(), accepted);
  }
  assert.equal(providerCalls, 1); assert.equal(getSession(sessionId)!.questionsAsked, 1);
  const headerVariants: (HeadersInit | undefined)[] = [undefined, { 'x-forwarded-for': '192.0.2.41' }, { 'x-real-ip': '192.0.2.42' }];
  for (const headers of headerVariants) {
    const denied = await interrogate(question('new-question-after-cap', headers));
    assert.equal(denied.status, 429); assert.equal((await denied.json()).code, 'RATE_LIMITED');
    assert.equal(denied.headers.get('Retry-After'), '60');
  }
  assert.equal(providerCalls, 1); assert.equal(getSession(sessionId)!.questionsAsked, 1);
  for (let index = 0; index < 20; index++) {
    const response = await leaderboard(new NextRequest('http://localhost/api/leaderboard'));
    assert.equal(response.status, 200); assert.deepEqual(await response.json(), { leaderboard: [] });
  }
  const denied = await leaderboard(new NextRequest('http://localhost/api/leaderboard'));
  assert.equal(denied.status, 429); assert.equal((await denied.json()).code, 'RATE_LIMITED');
  assert.equal(providerCalls, 1);
});
