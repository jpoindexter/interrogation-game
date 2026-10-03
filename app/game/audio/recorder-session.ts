import { VoiceRequestError } from './voice-request-error';

export interface RecordingRecovery { message: string; newAttemptRequired: boolean; busy: boolean }
export type RecorderHandle = Pick<MediaRecorder, 'start' | 'stop' | 'state' | 'mimeType'
  | 'ondataavailable' | 'onstop' | 'onerror'>;
export interface RecorderCallbacks {
  onTranscript: (text: string) => void;
  onError: (message: string) => void;
  onStatus?: (text: string) => void;
}
export interface RecorderDependencies {
  prepare?: (signal: AbortSignal) => Promise<number>;
  getStream: () => Promise<MediaStream>;
  createRecorder: (stream: MediaStream) => RecorderHandle;
  detectSilence: (stream: MediaStream, stop: () => void) => () => void;
  transcribe: (blob: Blob, signal: AbortSignal, newAttempt?: boolean) => Promise<string>;
  onRecovery?: (recovery: RecordingRecovery | null) => void;
  onListening: (listening: boolean) => void;
}
interface Recording {
  controller: AbortController;
  callbacks: RecorderCallbacks;
  chunks: Blob[];
  bytes: number;
  maxBytes: number;
  stream?: MediaStream;
  recorder?: RecorderHandle;
  stopSilence?: () => void;
  timer?: ReturnType<typeof setTimeout>;
  stopped: boolean;
  cancelled: boolean;
}

export class RecorderSession {
  private current?: Recording;
  private failed?: { recording: Recording; blob: Blob; newAttemptRequired: boolean };
  constructor(private readonly dependencies: RecorderDependencies) {}

  async start(callbacks: RecorderCallbacks): Promise<void> {
    this.cancel();
    const recording: Recording = { controller: new AbortController(), callbacks, chunks: [], bytes: 0,
      maxBytes: 25 * 1024 * 1024, stopped: false, cancelled: false };
    this.current = recording;
    try {
      if (this.dependencies.prepare) {
        recording.maxBytes = await this.dependencies.prepare(recording.controller.signal);
        if (recording.cancelled) return;
        callbacks.onStatus?.(`Record up to 60 seconds (${Math.floor(recording.maxBytes / 1024 / 1024)} MiB maximum), or type your question.`);
      }
      const stream = await this.dependencies.getStream();
      if (recording.cancelled) { stream.getTracks().forEach(track => track.stop()); return; }
      recording.stream = stream;
      const recorder = this.dependencies.createRecorder(stream);
      recording.recorder = recorder;
      recorder.ondataavailable = event => this.acceptChunk(recording, event.data);
      recorder.onstop = () => { void this.transcribe(recording); };
      recorder.onerror = () => this.fail(recording, '(microphone unavailable — try again or type below)');
      recorder.start(250);
      this.dependencies.onListening(true);
      recording.stopSilence = this.dependencies.detectSilence(stream, () => this.stop());
      recording.timer = setTimeout(() => this.stop(), 60_000);
    } catch (error) {
      const denied = error instanceof Error && error.name === 'NotAllowedError';
      this.fail(recording, denied
        ? '(mic access denied — allow microphone in browser settings, or type below)'
        : '(microphone unavailable — use the keyboard icon to type instead)');
    }
  }

  stop(): void {
    const recording = this.current;
    if (!recording) return;
    if (!recording.recorder) { this.cancel(); return; }
    if (recording.recorder.state === 'recording') recording.recorder.stop();
    this.releaseInput(recording);
    this.dependencies.onListening(false);
  }

  cancel(silent = false): void {
    this.failed = undefined;
    if (!silent) this.dependencies.onRecovery?.(null);
    const recording = this.current;
    if (!recording) return;
    recording.chunks = [];
    recording.cancelled = true;
    recording.controller.abort();
    this.detachRecorder(recording);
    this.releaseInput(recording);
    this.current = undefined;
    if (!silent) this.dependencies.onListening(false);
  }

  async retry(): Promise<void> {
    const failed = this.failed;
    if (!failed || this.current) return;
    this.failed = undefined;
    const recording = { ...failed.recording, controller: new AbortController(), cancelled: false };
    this.current = recording;
    this.dependencies.onRecovery?.({ message: 'Transcribing the retained recording…', newAttemptRequired: false, busy: true });
    await this.runTranscription(recording, failed.blob, failed.newAttemptRequired);
  }

  private acceptChunk(recording: Recording, chunk: Blob): void {
    if (recording.cancelled || this.current !== recording || !chunk.size) return;
    recording.bytes += chunk.size;
    if (recording.bytes > recording.maxBytes) {
      this.fail(recording, `Recording exceeded ${Math.floor(recording.maxBytes / 1024 / 1024)} MiB. Make a shorter recording or type your question.`);
      return;
    }
    recording.chunks.push(chunk);
  }

  private releaseInput(recording: Recording): void {
    clearTimeout(recording.timer);
    recording.stopSilence?.();
    recording.stopSilence = undefined;
    recording.stream?.getTracks().forEach(track => track.stop());
    recording.stream = undefined;
  }

  private detachRecorder(recording: Recording): void {
    const recorder = recording.recorder;
    if (!recorder) return;
    recorder.onstop = null;
    recorder.ondataavailable = null;
    recorder.onerror = null;
    if (recorder.state !== 'inactive') recorder.stop();
  }

  private fail(recording: Recording, message: string): void {
    if (recording.cancelled || this.current !== recording) return;
    this.cancel();
    recording.callbacks.onError(message);
  }

  private deliverTranscript(recording: Recording, text: string): void {
    if (recording.cancelled || this.current !== recording) return;
    this.current = undefined;
    this.dependencies.onRecovery?.(null);
    if (text.trim()) recording.callbacks.onTranscript(text.trim());
    else recording.callbacks.onError('(no speech detected — try again)');
  }

  private async transcribe(recording: Recording): Promise<void> {
    if (recording.stopped || recording.cancelled) return;
    recording.stopped = true;
    this.releaseInput(recording);
    this.dependencies.onListening(false);
    const blob = new Blob(recording.chunks, { type: recording.recorder?.mimeType || recording.chunks[0]?.type });
    this.detachRecorder(recording);
    if (blob.size < 2000) { this.fail(recording, '(no speech detected — try again)'); return; }
    recording.chunks = [];
    await this.runTranscription(recording, blob, false);
  }

  private retainFailure(recording: Recording, blob: Blob, error: unknown): void {
    if (recording.cancelled || this.current !== recording) return;
    this.current = undefined;
    const newAttemptRequired = error instanceof VoiceRequestError && error.newAttemptRequired;
    this.failed = { recording, blob, newAttemptRequired };
    const message = error instanceof Error ? error.message : 'Transcription could not be confirmed.';
    this.dependencies.onRecovery?.({ message, newAttemptRequired, busy: false });
    recording.callbacks.onError('Transcription was not accepted. Your recording is retained for review.');
  }

  private async runTranscription(recording: Recording, blob: Blob, newAttempt: boolean): Promise<void> {
    recording.timer = setTimeout(() => recording.controller.abort(), 30_000);
    try {
      recording.callbacks.onStatus?.('(transcribing...)');
      const text = await this.dependencies.transcribe(blob, recording.controller.signal, newAttempt);
      this.deliverTranscript(recording, text);
    } catch (error) {
      this.retainFailure(recording, blob, error);
    } finally { clearTimeout(recording.timer); }
  }
}
