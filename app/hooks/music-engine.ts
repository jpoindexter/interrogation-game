import { AudioResource } from './audio-resource';

const TRACKS = {
  menu: ['VelvetAlleyLoop', 'VelvetAlleyLoop2', 'MoonlitSavePoint4', 'MoonlitSavePoint5'],
  game: ['MidnightSavePoint', 'MidnightSavePoint2', 'MidnightSavePoint3', 'MidnightSavePoint4', 'MidnightSavePoint6', 'MidnightSavePoint7', 'SmokeInTheSavePoint', 'SmokeInTheSavePoint2'],
};

export class MusicEngine {
  private current: AudioResource | null = null;
  private resources = new Set<AudioResource>();
  private mode: 'menu' | 'game' = 'menu';
  private volume = 0;
  private playlist: string[] = [];
  private disposed = false;

  constructor(private createAudio: (src: string) => HTMLAudioElement) {}

  configure(mode: 'menu' | 'game', slider: number) {
    if (this.disposed) return;
    const changed = mode !== this.mode;
    this.mode = mode;
    this.volume = Math.pow(Math.max(0, Math.min(1, slider)), 3);
    if (!this.volume) { this.stop(); return; }
    if (changed) this.playlist = [];
    if (changed || !this.current) this.next();
    else this.current.setVolume(this.volume);
  }

  private next() {
    if (this.disposed || !this.volume) return;
    const previous = this.current;
    if (!this.playlist.length) this.playlist = [...TRACKS[this.mode]].sort(() => Math.random() - 0.5);
    const incoming = new AudioResource(this.createAudio(`/music/${this.playlist.pop()}.mp3`));
    incoming.audio.volume = 0;
    this.resources.add(incoming);
    this.current = incoming;
    incoming.listen('ended', () => { if (this.current === incoming) this.next(); });
    void incoming.play().then(playing => {
      if (playing && this.current === incoming) incoming.fade(this.volume, 1500);
    });
    if (previous) previous.fade(0, 750, () => {
      previous.dispose();
      this.resources.delete(previous);
    });
  }

  resume() {
    const current = this.current;
    if (current?.audio.paused) void current.play().then(playing => {
      if (playing && this.current === current) current.fade(this.volume, 1500);
    });
  }

  private stop() {
    this.resources.forEach(resource => resource.dispose());
    this.resources.clear();
    this.current = null;
  }

  dispose() { this.disposed = true; this.stop(); }
}
