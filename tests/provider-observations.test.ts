import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NextRequest } from 'next/server';
import { GET as health } from '../app/api/health/route';
import { POST as speech } from '../app/api/tts/route';
import { POST as transcribe } from '../app/api/transcribe/route';
import { requestStructured } from '../src/lib/ai/provider';
import { CodexProvider } from '../src/lib/ai/codex';
import { AiError } from '../src/lib/ai/contracts';
import { JUDGE_SCHEMA } from '../src/lib/ai/schemas';
import { OBSERVATION_MAX_AGE_MS } from '../src/lib/config/observation-contract';
import { createSession, getSession, deleteSession } from '../src/lib/game-session';
import { reserveVoiceUsage } from '../src/lib/voice/budget';

const verdict = { correct: false, confession: 'That is not my account.', explanation: 'The accusation misses the alibi.' };
const task = { capability: 'judge' as const, instructions: 'private prompt marker', input: 'private input marker', schema: JUDGE_SCHEMA };
function output(value: unknown = verdict) {
  return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }] });
}
function fixture(t: test.TestContext) {
  const directory = mkdtempSync(join(tmpdir(), 'observation-proof-'));
  const settings = { INTERROGATION_DATA_DIR: directory, AI_PROVIDER: 'openai', OPENAI_API_KEY: 'private-synthetic-key',
    AI_WORK_ENABLED: 'true', ELEVENLABS_API_KEY: 'private-synthetic-voice', SESSION_STORAGE: 'local', VERCEL: '', AWS_LAMBDA_FUNCTION_NAME: '' };
  const previous = Object.fromEntries(Object.keys(settings).map(key => [key, process.env[key]]));
  Object.assign(process.env, settings);
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    rmSync(directory, { recursive: true, force: true });
  });
}
async function observation(service: 'ai' | 'voice') {
  const response = health();
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const body = await response.json();
  assert.doesNotMatch(JSON.stringify(body), /private-synthetic|private prompt|private input|secret upstream/);
  return body.services[service].observation;
}

test('requested AI gateway work records validated results and structured failures; health only reads with freshness/config isolation', async t => {
  fixture(t);
  let response: () => Response | Promise<Response> = () => output();
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return response(); });
  assert.equal(await observation('ai'), null);
  assert.equal(calls, 0);
  for (const [status, expected] of [[401, 'authentication_failed'], [403, 'failed'], [429, 'rate_limited'], [503, 'unavailable']] as const) {
    response = () => new Response('secret upstream body', { status });
    await assert.rejects(requestStructured(task));
    assert.equal((await observation('ai')).status, expected);
  }
  response = () => output({ ...verdict, correct: 'not a boolean' });
  await assert.rejects(requestStructured(task));
  assert.equal((await observation('ai')).status, 'failed', 'HTTP 200 is not validated success');
  response = () => { throw new TypeError('secret upstream network detail'); };
  await assert.rejects(requestStructured(task));
  assert.equal((await observation('ai')).status, 'unavailable');
  response = () => output();
  assert.deepEqual(await requestStructured(task), verdict);
  const success = await observation('ai');
  assert.equal(success.status, 'succeeded'); assert.equal(success.operation, 'judge'); assert.equal(success.stale, false);
  assert.ok(Number.isFinite(Date.parse(success.observedAt)));
  const clock = t.mock.method(Date, 'now', () => Date.parse(success.observedAt) + OBSERVATION_MAX_AGE_MS);
  assert.equal((await observation('ai')).stale, true);
  clock.mock.restore();
  const count = calls;
  await assert.rejects(requestStructured({ ...task, input: 'x'.repeat(100_001) }));
  await assert.rejects(requestStructured({ ...task, signal: AbortSignal.abort() }));
  assert.deepEqual(await observation('ai'), success); assert.equal(calls, count, 'local denial and health never call provider');
  response = () => { process.env.OPENAI_API_KEY = 'private-synthetic-replaced'; return output(); };
  await requestStructured(task);
  assert.equal(await observation('ai'), null, 'late completion cannot label changed credentials as successful');
  response = () => output();
  await requestStructured(task);
  process.env.OPENAI_API_KEY = 'private-synthetic-third';
  assert.equal(await observation('ai'), null, 'changed configuration invalidates previous observation');
});

test('actual voice routes record fully consumed results, keep failed and replayed receipts honest, and do not treat local denial as provider auth', async t => {
  fixture(t);
  const id = createSession({ difficulty: 'easy', suspect_name: 'Casey', suspect_gender: 'nonbinary' });
  t.after(() => deleteSession(id));
  const session = getSession(id)!;
  session.status = 'active'; session.startTime = Date.now();
  session.conversationHistory.push({ role: 'assistant', content: 'I left at six.' });
  let response = () => new Response('synthetic-mp3');
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return response(); });
  const say = (requestId = crypto.randomUUID(), text = 'I left at six.') => speech(new NextRequest('http://localhost/api/tts', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: id, requestId, text }),
  }));
  const recording = () => {
    const form = new FormData();
    form.set('sessionId', id); form.set('requestId', crypto.randomUUID());
    form.set('audio', new File(['synthetic audio'], 'recording.mp4', { type: 'audio/mp4' }));
    return transcribe(new NextRequest('http://localhost/api/transcribe', { method: 'POST', body: form }));
  };
  const receipt = crypto.randomUUID();
  assert.equal((await say(receipt)).status, 200);
  const success = await observation('voice');
  assert.equal(success.status, 'succeeded'); assert.equal(success.operation, 'speech');
  assert.equal((await say(crypto.randomUUID(), 'unaccepted text')).status, 403);
  assert.deepEqual(await observation('voice'), success); assert.equal(calls, 1);
  response = () => new Response('secret upstream detail', { status: 401 });
  assert.equal((await say()).status, 502);
  assert.equal((await observation('voice')).status, 'authentication_failed');
  assert.equal((await say(receipt)).status, 200);
  assert.equal((await observation('voice')).status, 'authentication_failed', 'cached success is not a new provider result');
  assert.equal(calls, 2);
  response = () => new Response('');
  assert.equal((await say()).status, 502);
  assert.equal((await observation('voice')).status, 'failed', 'empty audio with 200 cannot count as success');
  response = () => Response.json({ text: 'Where were you?' });
  assert.equal((await recording()).status, 200);
  const transcript = await observation('voice');
  assert.equal(transcript.status, 'succeeded'); assert.equal(transcript.operation, 'transcription');
  reserveVoiceUsage(id, 'speechCharacters', 59_955);
  assert.equal((await say()).status, 429);
  assert.deepEqual(await observation('voice'), transcript, 'local budget denial is not upstream rate limiting');
  assert.equal(calls, 4);
});

test('CLI observation uses typed failures, never stderr-like authentication text, and ignores cancelled work', async t => {
  fixture(t);
  process.env.AI_PROVIDER = 'codex-local';
  let work: () => Promise<Record<string, unknown>> = async () => { throw new AiError('CODEX_FAILED', 'Sign in failed: private detail'); };
  t.mock.method(CodexProvider.prototype, 'generate', () => work());
  await assert.rejects(requestStructured(task));
  assert.equal((await observation('ai')).status, 'failed', 'generic CLI failure is not proven authentication failure');
  work = async () => { throw new AiError('CODEX_UNAVAILABLE', 'Private executable detail'); };
  await assert.rejects(requestStructured(task));
  assert.equal((await observation('ai')).status, 'unavailable');
  const timeout = new AbortController();
  work = async () => { timeout.abort(new DOMException('deadline', 'TimeoutError')); return verdict; };
  await assert.rejects(requestStructured({ ...task, signal: timeout.signal }), { code: 'TIMEOUT' });
  const previous = await observation('ai');
  assert.equal(previous.status, 'unavailable');
  const cancelled = new AbortController();
  work = async () => { cancelled.abort(); return verdict; };
  await assert.rejects(requestStructured({ ...task, signal: cancelled.signal }), { code: 'CANCELLED' });
  assert.deepEqual(await observation('ai'), previous);
});
