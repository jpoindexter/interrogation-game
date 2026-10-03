export interface AudioClock {
  schedule(callback: () => void, delay: number): ReturnType<typeof setTimeout>;
  cancel(timer: ReturnType<typeof setTimeout>): void;
}
const AUDIO_CLOCK: AudioClock = { schedule: (callback, delay) => setTimeout(callback, delay), cancel: clearTimeout };

/** Own every timer/listener attached to one audio element. Disposal is final. */
export class AudioResource {
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private cleanups: (() => void)[] = [];
  private disposed = false;

  constructor(readonly audio: HTMLAudioElement, private clock: AudioClock = AUDIO_CLOCK) {}

  schedule(callback: () => void, delay: number) {
    if (this.disposed) return;
    const timer = this.clock.schedule(() => {
      this.timers.delete(timer);
      if (!this.disposed) callback();
    }, delay);
    this.timers.add(timer);
  }

  listen(name: string, callback: EventListener) {
    this.audio.addEventListener(name, callback);
    this.cleanups.push(() => this.audio.removeEventListener(name, callback));
  }

  setVolume(volume: number) {
    this.cancelTimers();
    if (!this.disposed) this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  private cancelTimers() {
    this.timers.forEach(timer => this.clock.cancel(timer));
    this.timers.clear();
  }

  fade(target: number, duration: number, complete?: () => void) {
    this.cancelTimers();
    const start = this.audio.volume;
    let step = 0;
    const tick = () => {
      step += 1;
      this.audio.volume = Math.max(0, Math.min(1, start + (target - start) * step / 20));
      if (step < 20) this.schedule(tick, duration / 20);
      else complete?.();
    };
    this.schedule(tick, duration / 20);
  }

  async play() {
    if (this.disposed) return false;
    try {
      await this.audio.play();
      if (this.disposed) { this.audio.pause(); return false; }
      return true;
    } catch { return false; }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.cancelTimers();
    this.cleanups.forEach(cleanup => cleanup());
    this.cleanups = [];
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
  }
}
