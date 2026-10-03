import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, statSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { reserveVoiceUsage } from '../src/lib/voice/budget';
import { VOICE_TTL } from '../src/lib/voice/receipt-types';
import { voiceDirectory, VoiceReceiptStore, voiceHash } from '../src/lib/voice/receipt-store';
import { voiceHttpFixture, providerFixture, speechRequest, recordingRequest } from './voice-idempotency-http-fixture';

const directory = mkdtempSync(join(tmpdir(), 'voice-http-'));
const previousDirectory = process.env.INTERROGATION_DATA_DIR;
process.env.INTERROGATION_DATA_DIR = directory;
test.after(() => {
  if (previousDirectory === undefined) delete process.env.INTERROGATION_DATA_DIR;
  else process.env.INTERROGATION_DATA_DIR = previousDirectory;
  rmSync(directory, { recursive: true, force: true });
});

test('real HTTP dropped speech response and concurrent retry synthesize once, then replay private bytes', async t => {
  const http = await voiceHttpFixture(t);
  const provider = providerFixture(t);
  provider.state.hold = true;
  const requestId = crypto.randomUUID();
  const body = speechRequest(http.sessionId, requestId);
  const abort = new AbortController();
  const lost = fetch(`${http.base}/api/tts`, { ...body, signal: abort.signal });
  await provider.entered.promise;
  abort.abort();
  await assert.rejects(lost);
  const concurrent = await fetch(`${http.base}/api/tts`, body);
  assert.equal(concurrent.status, 409);
  assert.equal((await concurrent.json()).code, 'VOICE_IN_PROGRESS');
  provider.release.resolve();
  await new Promise(resolve => setTimeout(resolve, 30));
  const recovered = await fetch(`${http.base}/api/tts`, body);
  assert.equal(recovered.status, 200);
  assert.equal(await recovered.text(), 'synthetic-mp3');
  assert.equal(provider.state.calls, 1);
  assert.equal(recovered.headers.get('cache-control'), 'private, no-store');
  const files = readdirSync(voiceDirectory()).filter(name => name.endsWith('.json'));
  assert.ok(files.every(name => /^[a-f0-9]{64}\.json$/.test(name)));
  assert.ok(files.every(name => (statSync(join(voiceDirectory(), name)).mode & 0o777) === 0o600));
  assert.equal(statSync(voiceDirectory()).mode & 0o777, 0o700);
});

test('real HTTP transcription replay is byte-hash bound and conflicting audio does not reach provider', async t => {
  const http = await voiceHttpFixture(t);
  const provider = providerFixture(t);
  const id = crypto.randomUUID();
  const first = await fetch(`${http.base}/api/transcribe`, recordingRequest(http.sessionId, id));
  assert.equal(first.status, 200);
  assert.deepEqual(await first.json(), { text: 'Where were you?' });
  const repeat = await fetch(`${http.base}/api/transcribe`, recordingRequest(http.sessionId, id));
  assert.deepEqual(await repeat.json(), { text: 'Where were you?' });
  const conflict = await fetch(`${http.base}/api/transcribe`, recordingRequest(http.sessionId, id, 'different-audio'));
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).code, 'REQUEST_CONFLICT');
  assert.equal(provider.state.calls, 1);
});

test('provider failure is a completed receipt; only explicit new request ID starts another attempt', async t => {
  const http = await voiceHttpFixture(t);
  const provider = providerFixture(t);
  provider.state.fail = true;
  const id = crypto.randomUUID();
  const body = speechRequest(http.sessionId, id);
  assert.equal((await fetch(`${http.base}/api/tts`, body)).status, 502);
  provider.state.fail = false;
  assert.equal((await fetch(`${http.base}/api/tts`, body)).status, 502);
  assert.equal(provider.state.calls, 1);
  assert.equal((await fetch(`${http.base}/api/tts`, speechRequest(http.sessionId))).status, 200);
  assert.equal(provider.state.calls, 2);
});

test('pending crash receipt rejects automatic repeat and persisted success replays in another process', async t => {
  const http = await voiceHttpFixture(t);
  const provider = providerFixture(t);
  const id = crypto.randomUUID();
  const body = speechRequest(http.sessionId, id);
  assert.equal((await fetch(`${http.base}/api/tts`, body)).status, 200);
  const child = execFileSync(process.execPath, ['--import', 'tsx', 'tests/voice-idempotency-worker.ts'], {
    input: body.body, encoding: 'utf8', env: { ...process.env, INTERROGATION_DATA_DIR: directory },
  });
  assert.deepEqual(JSON.parse(child), { status: 200, audio: 'synthetic-mp3' });
  const store = new VoiceReceiptStore(voiceDirectory(), `${http.sessionId}:tts:${id}`);
  const record = store.load()!;
  store.save({ ...record, state: 'pending', response: undefined });
  const interrupted = await fetch(`${http.base}/api/tts`, body);
  assert.equal(interrupted.status, 409);
  assert.equal((await interrupted.json()).code, 'VOICE_INTERRUPTED');
  assert.equal(provider.state.calls, 1);
  assert.equal(record.fingerprint.length, voiceHash('fixture').length);
});


test('real HTTP dropped transcription and concurrent retry recognize one recording', async t => {
  const http = await voiceHttpFixture(t);
  const provider = providerFixture(t);
  provider.state.hold = true;
  const id = crypto.randomUUID();
  const abort = new AbortController();
  const lost = fetch(`${http.base}/api/transcribe`, { ...recordingRequest(http.sessionId, id), signal: abort.signal });
  await provider.entered.promise;
  abort.abort();
  await assert.rejects(lost);
  const concurrent = await fetch(`${http.base}/api/transcribe`, recordingRequest(http.sessionId, id));
  assert.equal(concurrent.status, 409);
  provider.release.resolve();
  await new Promise(resolve => setTimeout(resolve, 30));
  const recovered = await fetch(`${http.base}/api/transcribe`, recordingRequest(http.sessionId, id));
  assert.deepEqual(await recovered.json(), { text: 'Where were you?' });
  assert.equal(provider.state.calls, 1);
});

test('speech replay does not reserve usage twice and changed text or server model conflicts', async t => {
  const http = await voiceHttpFixture(t);
  const provider = providerFixture(t);
  const id = crypto.randomUUID();
  const body = speechRequest(http.sessionId, id);
  reserveVoiceUsage(http.sessionId, 'speechCharacters', 60_000 - 'I left at six.'.length);
  assert.equal((await fetch(`${http.base}/api/tts`, body)).status, 200);
  assert.equal((await fetch(`${http.base}/api/tts`, body)).status, 200);
  const changedText = { ...body, body: JSON.stringify({ ...JSON.parse(body.body), text: 'That was my account.' }) };
  assert.equal((await fetch(`${http.base}/api/tts`, changedText)).status, 409);
  const previous = process.env.ELEVENLABS_TTS_MODEL;
  process.env.ELEVENLABS_TTS_MODEL = 'different-test-model';
  try { assert.equal((await fetch(`${http.base}/api/tts`, body)).status, 409); }
  finally { if (previous === undefined) delete process.env.ELEVENLABS_TTS_MODEL; else process.env.ELEVENLABS_TTS_MODEL = previous; }
  assert.equal(provider.state.calls, 1);
});

test('expired receipt cannot silently regenerate audio', async t => {
  const http = await voiceHttpFixture(t);
  const provider = providerFixture(t);
  const id = crypto.randomUUID();
  const body = speechRequest(http.sessionId, id);
  await fetch(`${http.base}/api/tts`, body);
  const store = new VoiceReceiptStore(voiceDirectory(), `${http.sessionId}:tts:${id}`);
  store.save({ ...store.load()!, createdAt: Date.now() - VOICE_TTL - 1 });
  const response = await fetch(`${http.base}/api/tts`, body);
  assert.equal(response.status, 410);
  assert.equal((await response.json()).code, 'VOICE_EXPIRED');
  assert.equal(provider.state.calls, 1);
});
