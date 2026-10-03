export type PlaybackOutcome = 'ended' | 'skipped' | 'failed' | 'cancelled';
export type AudioHandle = Pick<HTMLAudioElement,
  'play' | 'pause' | 'volume' | 'currentTime' | 'duration' | 'onended' | 'onerror'>;
export interface SpeechDependencies {
  fetchAudio: (body: unknown, signal: AbortSignal) => Promise<Blob>;
  createUrl: (blob: Blob) => string;
  revokeUrl: (url: string) => void;
  createAudio: (url: string) => AudioHandle;
}
export interface SpeechRequest {
  body: unknown;
  volume: number;
  enabled?: boolean;
  onAudio?: (audio: AudioHandle | null) => void;
  onDone?: () => void;
  onError?: () => void;
}
interface Playback {
  request: SpeechRequest;
  controller: AbortController;
  resolve: (outcome: PlaybackOutcome) => void;
  audio?: AudioHandle;
  url?: string;
  finished: boolean;
  timer?: ReturnType<typeof setTimeout>;
}

/** Owns every request, audio element and object URL for one speech channel. */
export class SpeechPlayer {
  private current?: Playback;
  constructor(private readonly dependencies: SpeechDependencies) {}

  play(request: SpeechRequest): Promise<PlaybackOutcome> {
    this.stop('cancelled');
    return new Promise(resolve => {
      const playback: Playback = { request, controller: new AbortController(), resolve, finished: false };
      this.current = playback;
      if (request.enabled === false || request.volume === 0) {
        this.finish(playback, 'skipped');
      } else {
        void this.load(playback);
      }
    });
  }

  stop(outcome: 'skipped' | 'cancelled' = 'skipped'): void {
    if (this.current) this.finish(this.current, outcome);
  }

  setVolume(volume: number): void {
    if (this.current?.audio) this.current.audio.volume = volume;
    if (volume === 0) this.stop('skipped');
  }

  private async load(playback: Playback): Promise<void> {
    const { request, controller } = playback;
    playback.timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const blob = await this.dependencies.fetchAudio(request.body, controller.signal);
      clearTimeout(playback.timer);
      if (playback.finished) return;
      playback.url = this.dependencies.createUrl(blob);
      playback.audio = this.dependencies.createAudio(playback.url);
      playback.audio.volume = request.volume;
      playback.audio.onended = () => this.finish(playback, 'ended');
      playback.audio.onerror = () => this.finish(playback, 'failed');
      request.onAudio?.(playback.audio);
      if (!playback.finished) await playback.audio.play();
    } catch {
      this.finish(playback, 'failed');
    } finally {
      clearTimeout(playback.timer);
    }
  }

  private finish(playback: Playback, outcome: PlaybackOutcome): void {
    if (playback.finished) return;
    playback.finished = true;
    clearTimeout(playback.timer);
    playback.controller.abort();
    if (playback.audio) {
      playback.audio.onended = null;
      playback.audio.onerror = null;
      playback.audio.pause();
    }
    if (playback.url) this.dependencies.revokeUrl(playback.url);
    if (this.current === playback) this.current = undefined;
    playback.request.onAudio?.(null);
    playback.resolve(outcome);
    if (outcome === 'cancelled') return;
    if (outcome === 'failed') playback.request.onError?.();
    playback.request.onDone?.();
  }
}
