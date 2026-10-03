import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { voiceRequestId } from '../app/game/audio/voice-request-id';
import { browserSpeech } from '../app/game/audio/browser-speech';
import { transcribeRecording } from '../app/game/audio/browser-recorder';
import { VoiceRequestError } from '../app/game/audio/voice-request-error';
import type { RecordingRecovery as RecoveryState } from '../app/game/audio/recorder-session';
import RecordingRecovery from '../app/game/components/RecordingRecovery';
import { recorderFixture, flushAudio, deferred } from './audio-fixtures';

test('speech and transcription retain request IDs after a dropped response without automatic retry', async t => {
  const sent: Record<string, unknown>[] = [];
  let reject = true;
  t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    sent.push(url.endsWith('tts') ? JSON.parse(String(options.body)) : Object.fromEntries((options.body as FormData).entries()));
    if (reject) throw new Error('Dropped response');
    return url.endsWith('tts') ? new Response('audio') : Response.json({ text: 'Question' });
  });
  const signal = new AbortController().signal;
  const body = { sessionId: crypto.randomUUID(), text: 'Accepted statement.' };
  await assert.rejects(browserSpeech.fetchAudio(body, signal));
  assert.equal(sent.length, 1);
  reject = false;
  await browserSpeech.fetchAudio(body, signal);
  assert.equal(sent[0].requestId, sent[1].requestId);
  const blob = new Blob(['original recording'], { type: 'audio/mp4' });
  reject = true;
  await assert.rejects(transcribeRecording(blob, signal, String(body.sessionId)));
  reject = false;
  assert.equal(await transcribeRecording(blob, signal, String(body.sessionId)), 'Question');
  assert.equal(sent[2].requestId, sent[3].requestId);
  await transcribeRecording(blob, signal, String(body.sessionId), true);
  assert.notEqual(sent[3].requestId, sent[4].requestId);
});

test('failed recording retains the exact clip; explicit retry delivers only the recovered transcript', async () => {
  const blobs: Blob[] = [];
  const recovery: (RecoveryState | null)[] = [];
  const fixture = recorderFixture({ onRecovery: value => recovery.push(value), transcribe: async blob => {
    blobs.push(blob);
    if (blobs.length === 1) throw new Error('Connection lost');
    return 'Recovered question';
  } });
  await fixture.session.start(fixture.callbacks);
  fixture.session.stop();
  await flushAudio();
  assert.deepEqual(fixture.transcripts, []);
  assert.equal(blobs.length, 1, 'no automatic provider retry');
  assert.equal(recovery.at(-1)?.newAttemptRequired, false);
  await fixture.session.retry();
  assert.equal(blobs[0], blobs[1]);
  assert.deepEqual(fixture.transcripts, ['Recovered question']);
  assert.equal(recovery.at(-1), null);
});

test('known interrupted attempt requires explicit new attempt and discard prevents any repeat', async () => {
  const modes: boolean[] = [];
  const recovery: (RecoveryState | null)[] = [];
  const fixture = recorderFixture({ onRecovery: value => recovery.push(value), transcribe: async (_blob, _signal, fresh) => {
    modes.push(Boolean(fresh));
    throw new VoiceRequestError('Interrupted; review usage before repeating.', true);
  } });
  await fixture.session.start(fixture.callbacks);
  fixture.session.stop(); await flushAudio();
  assert.equal(recovery.at(-1)?.newAttemptRequired, true);
  await fixture.session.retry();
  assert.deepEqual(modes, [false, true]);
  fixture.session.cancel();
  await fixture.session.retry();
  assert.deepEqual(modes, [false, true]);
  assert.equal(recovery.at(-1), null);
});

test('leaving during retained-clip retry cancels delivery and clears recovery', async () => {
  const pending = deferred<string>();
  let calls = 0;
  const recovery: (RecoveryState | null)[] = [];
  const fixture = recorderFixture({ onRecovery: value => recovery.push(value), transcribe: async () => {
    if (++calls === 1) throw new Error('Dropped');
    return pending.promise;
  } });
  await fixture.session.start(fixture.callbacks);
  fixture.session.stop(); await flushAudio();
  const retry = fixture.session.retry();
  fixture.session.cancel();
  pending.resolve('Late transcript must be ignored');
  await retry;
  assert.deepEqual(fixture.transcripts, []);
  assert.equal(recovery.at(-1), null);
});

test('recovery controls name the action and disclose possible repeated provider usage', () => {
  const markup = renderToStaticMarkup(<RecordingRecovery
    recovery={{ message: 'Interrupted', busy: false, newAttemptRequired: true }}
    onRetry={() => {}} onDiscard={() => {}} disabled={false} />);
  assert.match(markup, /aria-label="Recording recovery"/);
  assert.match(markup, /Start new transcription attempt/);
  assert.match(markup, /may have consumed provider usage/);
  assert.match(markup, /Discard recording/);
  assert.match(markup, /role="status"/);
});


test('blocked browser storage keeps same-view retry IDs and stores no raw content when available', async t => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  t.after(() => { if (original) Object.defineProperty(globalThis, 'sessionStorage', original); else Reflect.deleteProperty(globalThis, 'sessionStorage'); });
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get() { throw new Error('Storage blocked'); } });
  const identity = ['tts', crypto.randomUUID(), 'Private accepted words'];
  const first = await voiceRequestId(identity);
  assert.equal(await voiceRequestId(identity), first);
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } });
  await voiceRequestId(['stt', crypto.randomUUID(), 'raw-recording-sentinel'], true);
  const saved = values.get('voiceRequestReceipts')!;
  assert.doesNotMatch(saved, /raw-recording-sentinel|Private accepted words/);
  const entries = Object.entries(JSON.parse(saved));
  assert.ok(entries.every(([key, value]) => /^[a-f0-9]{64}$/.test(key) && typeof value === 'string'));
});
