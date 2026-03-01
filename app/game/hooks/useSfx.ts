import { useRef, useCallback, useEffect } from 'react';

const SFX: Record<string, { src: string; vol: number }> = {
  click:        { src: '/efx/click.wav',        vol: 0.25 },
  paper:        { src: '/efx/paper.wav',         vol: 0.2 },
  close:        { src: '/efx/close.wav',         vol: 0.2 },
  typewriter:   { src: '/efx/typewriter.wav',    vol: 0.2 },
  papershuffle: { src: '/efx/papershuffle.wav',  vol: 0.2 },
  paperslide:   { src: '/efx/paperslide.wav',    vol: 0.2 },
  paper_ruffle: { src: '/efx/paper_ruffle.wav',  vol: 0.2 },
  mic_on:       { src: '/efx/mic_on.wav',        vol: 0.25 },
  mic_off:      { src: '/efx/mic_off.wav',       vol: 0.25 },
  slam:         { src: '/efx/slam.mp3',          vol: 0.35 },
};

export type SfxName = keyof typeof SFX;

export function useSfx() {
  const cache = useRef<Map<string, HTMLAudioElement>>(new Map());
  const muted = useRef(false);

  useEffect(() => {
    const sync = () => {
      try {
        const s = localStorage.getItem('appSettings');
        if (s) muted.current = JSON.parse(s).musicVolume === 0;
      } catch {}
    };
    sync();
    window.addEventListener('settingsChanged', sync);
    return () => window.removeEventListener('settingsChanged', sync);
  }, []);

  const play = useCallback((name: SfxName) => {
    if (muted.current) return;
    const entry = SFX[name];
    if (!entry) return;
    let audio = cache.current.get(entry.src);
    if (!audio) {
      audio = new Audio(entry.src);
      cache.current.set(entry.src, audio);
    }
    audio.currentTime = 0;
    audio.volume = entry.vol;
    audio.play().catch(() => {});
    // Quick fade-out for slam
    if (name === 'slam') {
      const targetVol = entry.vol;
      setTimeout(() => {
        let step = 0;
        const steps = 10;
        const timer = setInterval(() => {
          step++;
          audio!.volume = Math.max(0, targetVol * (1 - step / steps));
          if (step >= steps) { clearInterval(timer); audio!.pause(); audio!.currentTime = 0; }
        }, 50);
      }, 400);
    }
  }, []);

  return play;
}
