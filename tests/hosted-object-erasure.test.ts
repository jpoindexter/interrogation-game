import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { eraseHostedAudio } from '../src/lib/voice/hosted-object-erasure';
import { VoiceError } from '../src/lib/voice/errors';

const origin = 'https://erasure-fixture.supabase.co';
const bucket = 'private-voice';
const key = `${'a'.repeat(64)}/tts/${'b'.repeat(64)}.mp3`;
const signal = () => new AbortController().signal;
const failure = (error: unknown) => error instanceof VoiceError && error.status === 503
  && error.code === 'VOICE_STORAGE_UNAVAILABLE'
  && error.message === 'Saved audio is temporarily unavailable. Retry the same request.';

function configure(context: TestContext) {
  const previous = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
  process.env.SUPABASE_URL = origin;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'synthetic-service-key';
  context.after(() => {
    if (previous.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previous.url;
    if (previous.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previous.key;
  });
}

test('actual SDK deletes one exact object and confirms absence; missing object is idempotent', async context => {
  configure(context);
  let exists = true;
  const calls: string[] = [];
  context.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, options?: RequestInit) => {
    const url = new URL(String(input));
    assert.equal(url.origin, origin);
    assert.equal(url.search, '');
    assert.equal(options?.redirect, 'error');
    assert.ok(options?.signal instanceof AbortSignal);
    assert.equal(new Headers(options?.headers).get('authorization'), 'Bearer synthetic-service-key');
    calls.push(`${options?.method} ${url.pathname}`);
    if (url.pathname === `/storage/v1/bucket/${bucket}`) {
      assert.equal(options?.method, 'GET');
      return Response.json({ id: bucket, public: false });
    }
    if (options?.method === 'DELETE') {
      assert.equal(url.pathname, `/storage/v1/object/${bucket}`);
      assert.deepEqual(JSON.parse(String(options.body)), { prefixes: [key] });
      exists = false;
      return Response.json([]);
    }
    assert.equal(options?.method, 'HEAD');
    assert.equal(url.pathname, `/storage/v1/object/${bucket}/${key}`);
    return new Response(null, { status: exists ? 200 : 404 });
  });
  await eraseHostedAudio(bucket, key, signal());
  await eraseHostedAudio(bucket, key, signal());
  assert.deepEqual(calls, [
    `GET /storage/v1/bucket/${bucket}`, `HEAD /storage/v1/object/${bucket}/${key}`,
    `DELETE /storage/v1/object/${bucket}`, `HEAD /storage/v1/object/${bucket}/${key}`,
    `GET /storage/v1/bucket/${bucket}`, `HEAD /storage/v1/object/${bucket}/${key}`,
  ]);
});

test('invalid destinations and missing, mismatched or public buckets never reach objects', async context => {
  configure(context);
  let calls = 0;
  let response: unknown = { id: bucket, public: true };
  let status = 200;
  context.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, options?: RequestInit) => {
    calls++;
    assert.equal(String(input), `${origin}/storage/v1/bucket/${bucket}`);
    assert.equal(options?.method, 'GET');
    return Response.json(response, { status });
  });
  for (const destination of ['Private-voice', '../private', `${bucket}\n`]) {
    await assert.rejects(eraseHostedAudio(destination, key, signal()), failure);
  }
  for (const path of ['../escape.mp3', key.toUpperCase(), `${key}\n`, `${key}?token=secret`]) {
    await assert.rejects(eraseHostedAudio(bucket, path, signal()), failure);
  }
  assert.equal(calls, 0);
  await assert.rejects(eraseHostedAudio(bucket, key, signal()), failure);
  response = { id: 'other-private', public: false };
  await assert.rejects(eraseHostedAudio(bucket, key, signal()), failure);
  status = 404; response = { message: 'private metadata' };
  await assert.rejects(eraseHostedAudio(bucket, key, signal()), failure);
  assert.equal(calls, 3);
});

test('actual SDK 400, 403, unknown HEAD errors and persistent objects fail closed', async context => {
  configure(context);
  let headStatus = 400;
  let deletes = 0;
  context.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, options?: RequestInit) => {
    if (String(input).includes('/bucket/')) return Response.json({ id: bucket, public: false });
    if (options?.method === 'DELETE') { deletes++; return Response.json([]); }
    if (headStatus === 0) throw new Error('https://private.invalid?secret=credential');
    return new Response(null, { status: headStatus });
  });
  for (const status of [400, 403, 500, 0]) {
    headStatus = status;
    await assert.rejects(eraseHostedAudio(bucket, key, signal()), failure);
  }
  assert.equal(deletes, 0);
  headStatus = 200;
  await assert.rejects(eraseHostedAudio(bucket, key, signal()), failure);
  assert.equal(deletes, 1);
});

test('uncertain DELETE responses never acknowledge erasure even when object disappeared', async context => {
  configure(context);
  let exists = true;
  let heads = 0;
  let mode = 'transport';
  context.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, options?: RequestInit) => {
    if (String(input).includes('/bucket/')) return Response.json({ id: bucket, public: false });
    if (options?.method === 'HEAD') { heads++; return new Response(null, { status: exists ? 200 : 404 }); }
    assert.equal(options?.method, 'DELETE');
    exists = false;
    if (mode === 'transport') throw new Error('credential and object metadata');
    if (mode === 'malformed') return new Response('invalid JSON');
    return Response.json({ message: 'credential and object metadata' }, { status: 503 });
  });
  for (const value of ['transport', 'malformed', 'http']) {
    mode = value; exists = true; heads = 0;
    await assert.rejects(eraseHostedAudio(bucket, key, signal()), failure);
    assert.equal(heads, 1);
    await eraseHostedAudio(bucket, key, signal());
    assert.equal(heads, 2);
  }
});

test('cancellation is sanitized and an in-flight SDK deletion is awaited', async context => {
  configure(context);
  let controller = new AbortController();
  controller.abort('private cancellation reason');
  let calls = 0;
  let release: () => void = () => { throw new Error('DELETE has not started'); };
  let started: () => void = () => {};
  const deletionStarted = new Promise<void>(resolve => { started = resolve; });
  context.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, options?: RequestInit) => {
    calls++;
    if (String(input).includes('/bucket/')) return Response.json({ id: bucket, public: false });
    if (options?.method === 'HEAD') return new Response(null);
    assert.equal(options?.method, 'DELETE');
    const pending = new Promise<void>(resolve => { release = resolve; });
    started();
    await pending;
    return Response.json([]);
  });
  await assert.rejects(eraseHostedAudio(bucket, key, controller.signal), failure);
  assert.equal(calls, 0);
  controller = new AbortController();
  let settled = false;
  const operation = eraseHostedAudio(bucket, key, controller.signal).finally(() => { settled = true; });
  const rejected = assert.rejects(operation, failure);
  await deletionStarted;
  controller.abort('private cancellation reason');
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(settled, false);
  release();
  await rejected;
  assert.equal(calls, 3);
});
