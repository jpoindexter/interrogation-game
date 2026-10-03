import assert from 'node:assert/strict';
import test from 'node:test';
import { recordingFilename } from '../app/game/audio/browser-recorder';
import { deferred, flushAudio, recorderFixture } from './audio-fixtures';

void test('manual stop transcribes once and disposes microphone and silence monitor', async () => {
  let mime = '';
  const fixture = recorderFixture({ transcribe: async blob => { mime = blob.type; return ' Statement '; } });
  await fixture.session.start(fixture.callbacks);
  fixture.session.stop();
  fixture.session.stop();
  await flushAudio();
  assert.deepEqual(fixture.transcripts, ['Statement']);
  assert.deepEqual(fixture.errors, []);
  assert.equal(mime, 'audio/mp4');
  assert.equal(fixture.resources.stoppedTracks, 1);
  assert.equal(fixture.resources.disposedAnalysers, 1);
  assert.equal(fixture.listening.at(-1), false);
});

void test('navigation during microphone permission discards and releases a late stream', async () => {
  const permission = deferred<MediaStream>();
  const fixture = recorderFixture({ getStream: () => permission.promise });
  const start = fixture.session.start(fixture.callbacks);
  fixture.session.cancel(true);
  permission.resolve(fixture.stream);
  await start;
  assert.equal(fixture.resources.stoppedTracks, 1);
  assert.equal(fixture.recorder.state, 'inactive');
  assert.deepEqual(fixture.transcripts, []);
  assert.deepEqual(fixture.errors, []);
  assert.deepEqual(fixture.listening, []);
});

void test('navigation cancels transcription and ignores its late result', async () => {
  const result = deferred<string>();
  let signal: AbortSignal | undefined;
  const fixture = recorderFixture({ transcribe: (_blob, abort) => { signal = abort; return result.promise; } });
  await fixture.session.start(fixture.callbacks);
  fixture.session.stop();
  await flushAudio();
  fixture.session.cancel(true);
  assert.equal(signal?.aborted, true);
  result.resolve('This must not become a question');
  await flushAudio();
  assert.deepEqual(fixture.transcripts, []);
  assert.deepEqual(fixture.errors, []);
});

void test('recorder construction failure closes an already acquired microphone', async () => {
  const fixture = recorderFixture({ createRecorder: () => { throw new Error('Unsupported MIME'); } });
  await fixture.session.start(fixture.callbacks);
  assert.equal(fixture.resources.stoppedTracks, 1);
  assert.equal(fixture.errors.length, 1);
  assert.equal(fixture.listening.at(-1), false);
});

void test('starting another recording suppresses an older transcription', async () => {
  const result = deferred<string>();
  const fixture = recorderFixture({ transcribe: () => result.promise });
  await fixture.session.start(fixture.callbacks);
  fixture.session.stop();
  await flushAudio();
  await fixture.session.start(fixture.callbacks);
  result.resolve('Old turn');
  await flushAudio();
  assert.deepEqual(fixture.transcripts, []);
  assert.equal(fixture.recorder.state, 'recording');
  fixture.session.cancel();
});

void test('recording filenames match actual recorder MIME types', () => {
  assert.equal(recordingFilename('audio/mp4'), 'recording.m4a');
  assert.equal(recordingFilename('audio/webm;codecs=opus'), 'recording.webm');
  assert.equal(recordingFilename('audio/ogg;codecs=opus'), 'recording.ogg');
});

void test('transcription HTTP failures do not become accepted transcripts', async context => {
  const { transcribeRecording } = await import('../app/game/audio/browser-recorder');
  context.mock.method(globalThis, 'fetch', async () => new Response('{"text":"must reject"}', { status: 503 }));
  await assert.rejects(transcribeRecording(new Blob(['audio']), new AbortController().signal), /Transcription failed/);
});

void test('transcription sends actual MIME extension, session and abort signal', async context => {
  const { transcribeRecording } = await import('../app/game/audio/browser-recorder');
  const controller = new AbortController();
  let form: FormData | undefined;
  let signal: AbortSignal | null | undefined;
  context.mock.method(globalThis, 'fetch', async (_input: unknown, options: RequestInit) => {
    form = options.body as FormData;
    signal = options.signal;
    return new Response('{"text":"  Hello  "}', { status: 200 });
  });
  assert.equal(await transcribeRecording(new Blob(['audio'], { type: 'audio/mp4' }), controller.signal, 'session-1'), 'Hello');
  assert.equal((form?.get('audio') as File).name, 'recording.m4a');
  assert.equal(form?.get('sessionId'), 'session-1');
  assert.equal(signal, controller.signal);
});
