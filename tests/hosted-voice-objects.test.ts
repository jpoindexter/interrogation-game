import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test, { type TestContext } from 'node:test';
import { HostedVoiceObjects } from '../src/lib/voice/hosted-objects';
import { MAX_AUDIO_BYTES } from '../src/lib/voice/receipt-types';
import { browserSpeech } from '../app/game/audio/browser-speech';
import { parseSignedDelivery, readAudioDelivery } from '../app/game/audio/audio-delivery';

const origin = 'https://voice-fixture.supabase.co';
const bucket = 'private-voice';
const key = `${'a'.repeat(64)}/tts/${'b'.repeat(64)}.mp3`;
const audio = new TextEncoder().encode('synthetic audio bytes');
const metadata = { objectKey: key, bytes: audio.length, sha256: createHash('sha256').update(audio).digest('hex') };
const signed = () => ({ audioUrl: `${origin}/storage/v1/object/sign/${bucket}/${key}?token=synthetic`,
  expiresAt: Date.now() + 60_000, bytes: metadata.bytes, sha256: metadata.sha256 });
const signal = () => new AbortController().signal;

function configure(context: TestContext) {
  const previous = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
  process.env.SUPABASE_URL = origin;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'synthetic-service-key';
  context.after(() => {
    if (previous.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previous.url;
    if (previous.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previous.key;
  });
}

test('actual SDK uploads immutably, recovers verified bytes and signs only the exact private object', async context => {
  configure(context);
  let saved = false;
  let bucketReads = 0;
  let signingPath = `/object/sign/${bucket}/${key}?token=synthetic`;
  context.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, options?: RequestInit) => {
    const url = new URL(String(input));
    assert.equal(url.origin, origin);
    assert.equal(options?.redirect, 'error');
    assert.equal(new Headers(options?.headers).get('authorization'), 'Bearer synthetic-service-key');
    if (url.pathname === `/storage/v1/bucket/${bucket}`) {
      bucketReads++; return Response.json({ id: bucket, public: false });
    }
    if (url.pathname.includes('/object/sign/')) {
      assert.deepEqual(JSON.parse(String(options?.body)), { expiresIn: 60 });
      return Response.json({ signedURL: signingPath });
    }
    assert.equal(url.pathname, `/storage/v1/object/${bucket}/${key}`);
    if (options?.method === 'POST') {
      assert.equal(new Headers(options.headers).get('x-upsert'), 'false');
      assert.equal(new Headers(options.headers).get('content-type'), 'audio/mpeg');
      if (saved) return Response.json({ message: 'Exists', statusCode: '409' }, { status: 409 });
      assert.deepEqual(options.body, audio); saved = true;
      return Response.json({ Id: 'fixture', Key: `${bucket}/${key}` });
    }
    return new Response(audio, { headers: { 'content-type': 'audio/mpeg' } });
  });
  const objects = new HostedVoiceObjects(bucket);
  assert.deepEqual(await objects.save(key, audio, signal()), metadata);
  await assert.rejects(objects.save(key, audio, signal()), /temporarily unavailable/);
  assert.deepEqual(await objects.recover(key, signal()), metadata);
  const delivery = await objects.sign(metadata);
  assert.equal(delivery.audioUrl, signed().audioUrl);
  assert.equal(delivery.sha256, metadata.sha256);
  assert.ok(delivery.expiresAt <= Date.now() + 60_000 && delivery.expiresAt > Date.now());
  signingPath = '/object/sign/wrong/path?token=synthetic';
  await assert.rejects(objects.sign(metadata), /temporarily unavailable/);
  assert.equal(bucketReads, 5);
});

test('storage rejects public or unavailable buckets, uncertain reads, oversized objects and unsafe keys', async context => {
  configure(context);
  let mode = 'public';
  let objectCalls = 0;
  context.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
    if (String(input).includes('/bucket/')) {
      if (mode === 'bucket-error') return Response.json({ message: 'Unavailable' }, { status: 503 });
      return Response.json({ id: bucket, public: mode === 'public' });
    }
    objectCalls++;
    if (mode === 'oversized') return new Response(new Uint8Array(MAX_AUDIO_BYTES + 1));
    return Response.json({ message: 'Unavailable', statusCode: mode === 'missing' ? '404' : '503' },
      { status: mode === 'missing' ? 404 : 503 });
  });
  const objects = new HostedVoiceObjects(bucket);
  await assert.rejects(objects.save(key, audio, signal()));
  await assert.rejects(objects.recover(key, signal()));
  await assert.rejects(objects.sign(metadata));
  assert.equal(objectCalls, 0);
  mode = 'bucket-error';
  await assert.rejects(objects.recover(key, signal()));
  assert.equal(objectCalls, 0);
  mode = 'missing'; assert.equal(await objects.recover(key, signal()), null);
  mode = 'error'; await assert.rejects(objects.recover(key, signal()));
  mode = 'oversized'; await assert.rejects(objects.recover(key, signal()));
  assert.throws(() => new HostedVoiceObjects('../public'));
  await assert.rejects(objects.save('../escape.mp3', audio, signal()));
  await assert.rejects(objects.save(key, new Uint8Array(MAX_AUDIO_BYTES + 1), signal()));
  assert.equal(objectCalls, 3);
});

test('browser keeps one voice request ID across signed-link retry and verifies private downloads', async context => {
  const requestIds: string[] = [];
  let broken = true;
  context.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, options?: RequestInit) => {
    if (String(input) === '/api/tts') {
      requestIds.push(JSON.parse(String(options?.body)).requestId);
      return Response.json(signed());
    }
    assert.equal(String(input), signed().audioUrl);
    assert.equal(options?.credentials, 'omit');
    assert.equal(options?.referrerPolicy, 'no-referrer');
    assert.equal(options?.redirect, 'error');
    assert.equal(options?.cache, 'no-store');
    return new Response(broken ? 'corrupted' : audio);
  });
  const body = { sessionId: crypto.randomUUID(), text: 'A saved statement.' };
  await assert.rejects(browserSpeech.fetchAudio(body, signal()), /Audio could not be loaded/);
  broken = false;
  const blob = await browserSpeech.fetchAudio(body, signal());
  assert.equal(blob.type, 'audio/mpeg');
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), audio);
  assert.equal(requestIds.length, 2);
  assert.equal(requestIds[0], requestIds[1]);
  const local = await readAudioDelivery(new Response(audio, { headers: { 'content-type': 'audio/mpeg' } }), signal());
  assert.equal(local.size, audio.length);
});

test('browser fails closed on malformed signed responses, redirects, overflow and cancellation', async context => {
  for (const override of [
    { audioUrl: 'https://attacker.invalid/audio.mp3' }, { audioUrl: `${signed().audioUrl}&extra=1` },
    { audioUrl: signed().audioUrl.replace('/tts/', '/other/') }, { expiresAt: Date.now() - 1 },
    { bytes: MAX_AUDIO_BYTES + 1 }, { sha256: 'invalid' },
  ]) assert.throws(() => parseSignedDelivery({ ...signed(), ...override }));
  let mode = 'redirect';
  context.mock.method(globalThis, 'fetch', async () => mode === 'redirect'
    ? new Response(null, { status: 302, headers: { location: 'https://attacker.invalid' } })
    : new Response(new Uint8Array(audio.length + 1)));
  await assert.rejects(readAudioDelivery(Response.json(signed()), signal()));
  mode = 'oversized'; await assert.rejects(readAudioDelivery(Response.json(signed()), signal()));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(readAudioDelivery(Response.json(signed()), controller.signal));
});
