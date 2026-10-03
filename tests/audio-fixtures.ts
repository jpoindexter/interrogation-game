import { SpeechPlayer, type AudioHandle, type SpeechDependencies } from '../app/game/audio/speech-player';
import { RecorderSession, type RecorderDependencies, type RecorderHandle } from '../app/game/audio/recorder-session';

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
export const flushAudio = () => new Promise<void>(resolve => setImmediate(resolve));

export class FakeAudio implements AudioHandle {
  volume = 1;
  currentTime = 0;
  duration = 10;
  onended: AudioHandle['onended'] = null;
  onerror: AudioHandle['onerror'] = null;
  plays = 0;
  pauses = 0;
  rejectPlay = false;
  async play() { this.plays++; if (this.rejectPlay) throw new Error('Autoplay blocked'); }
  pause() { this.pauses++; }
  end() { this.onended?.call(this as unknown as HTMLMediaElement, new Event('ended')); }
  error() { this.onerror?.call(this as unknown as GlobalEventHandlers, new Event('error')); }
}

export function speechFixture(fetchAudio?: SpeechDependencies['fetchAudio']) {
  const audio = new FakeAudio();
  const created: string[] = [];
  const revoked: string[] = [];
  const player = new SpeechPlayer({
    fetchAudio: fetchAudio ?? (async () => new Blob(['voice'])),
    createUrl: () => { const url = `blob:${created.length}`; created.push(url); return url; },
    revokeUrl: url => revoked.push(url), createAudio: () => audio,
  });
  return { player, audio, created, revoked };
}

export class FakeRecorder implements RecorderHandle {
  state: RecordingState = 'inactive';
  mimeType = 'audio/mp4';
  ondataavailable: RecorderHandle['ondataavailable'] = null;
  onstop: RecorderHandle['onstop'] = null;
  onerror: RecorderHandle['onerror'] = null;
  start() { this.state = 'recording'; }
  stop() {
    this.state = 'inactive';
    queueMicrotask(() => {
      const event = { data: new Blob(['x'.repeat(2100)], { type: this.mimeType }) } as BlobEvent;
      this.ondataavailable?.call(this as unknown as MediaRecorder, event);
      this.onstop?.call(this as unknown as MediaRecorder, new Event('stop'));
    });
  }
}

export function recorderFixture(overrides: Partial<RecorderDependencies> = {}) {
  const recorder = new FakeRecorder();
  const listening: boolean[] = [];
  const transcripts: string[] = [];
  const errors: string[] = [];
  const resources = { stoppedTracks: 0, disposedAnalysers: 0 };
  const stream = { getTracks: () => [{ stop: () => resources.stoppedTracks++ }] } as unknown as MediaStream;
  const session = new RecorderSession({
    getStream: async () => stream, createRecorder: () => recorder,
    detectSilence: () => () => { resources.disposedAnalysers++; },
    transcribe: async () => 'A statement', onListening: value => listening.push(value), ...overrides,
  });
  const callbacks = { onTranscript: (text: string) => { transcripts.push(text); },
    onError: (error: string) => { errors.push(error); } };
  return { session, recorder, stream, resources, listening, transcripts, errors, callbacks };
}
