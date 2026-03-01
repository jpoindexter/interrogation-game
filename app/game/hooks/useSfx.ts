import { useRef, useCallback, useEffect } from 'react';

const SFX: Record<string, { src: string; vol: number }> = {
  click:        { src: '/efx/click.wav',        vol: 0.25 },
  click_short:  { src: '/efx/click.wav',        vol: 0.2 },
  paper:        { src: '/efx/paper.wav',         vol: 0.2 },
  close:        { src: '/efx/close.wav',         vol: 0.2 },
  typewriter:   { src: '/efx/typewriter.wav',    vol: 0.2 },
  papershuffle: { src: '/efx/papershuffle.wav',  vol: 0.2 },
  paperslide:   { src: '/efx/paperslide.wav',    vol: 0.2 },
  paper_ruffle: { src: '/efx/paper_ruffle.wav',  vol: 0.2 },
  mic_on:       { src: '/efx/mic_on.wav',        vol: 0.25 },
  mic_off:      { src: '/efx/mic_off.wav',       vol: 0.25 },
  slam:         { src: '/efx/slam.mp3',          vol: 0.35 },
  chime:        { src: '/efx/chime.mp3',         vol: 0.25 },
  error:        { src: '/efx/error.mp3',         vol: 0.2 },
  tension:      { src: '/efx/tension.mp3',       vol: 0.0 },
};

export type SfxName = keyof typeof SFX;

function getSfxVolume(): number {
  try {
    const s = localStorage.getItem('appSettings');
    if (s) {
      const parsed = JSON.parse(s);
      return parsed.sfxVolume ?? 0.5;
    }
  } catch {}
  return 0.5;
}

export function useSfx() {
  const cache = useRef<Map<string, HTMLAudioElement>>(new Map());
  const volumeRef = useRef(0.5);

  useEffect(() => {
    const sync = () => { volumeRef.current = getSfxVolume(); };
    sync();
    window.addEventListener('settingsChanged', sync);
    return () => window.removeEventListener('settingsChanged', sync);
  }, []);

  const play = useCallback((name: SfxName) => {
    const masterVol = volumeRef.current;
    if (masterVol === 0) return;
    const entry = SFX[name];
    if (!entry) return;
    let audio = cache.current.get(name);
    if (!audio) {
      audio = new Audio(entry.src);
      cache.current.set(name, audio);
    }
    audio.currentTime = 0;
    audio.volume = entry.vol * masterVol;
    audio.play().catch(() => {});
    // Tension: fade in (400ms) → hold (600ms) → fade out (500ms)
    if (name === 'tension') {
      const peakVol = 0.2 * masterVol;
      const steps = 10;
      let inStep = 0;
      const fadeInTimer = setInterval(() => {
        inStep++;
        audio!.volume = peakVol * (inStep / steps);
        if (inStep >= steps) {
          clearInterval(fadeInTimer);
          setTimeout(() => {
            let outStep = 0;
            const fadeOutTimer = setInterval(() => {
              outStep++;
              audio!.volume = Math.max(0, peakVol * (1 - outStep / steps));
              if (outStep >= steps) { clearInterval(fadeOutTimer); audio!.pause(); audio!.currentTime = 0; }
            }, 500 / steps);
          }, 600);
        }
      }, 400 / steps);
      return;
    }

    // Quick fade-out for slam, chime, etc
    const fadeConfig: Record<string, { delay: number; duration: number }> = {
      click_short: { delay: 80, duration: 200 },
      slam: { delay: 400, duration: 500 },
      chime: { delay: 600, duration: 800 },
      error: { delay: 300, duration: 500 },
    };
    const fade = fadeConfig[name];
    if (fade) {
      const targetVol = entry.vol * masterVol;
      setTimeout(() => {
        const steps = 15;
        let step = 0;
        const t = setInterval(() => {
          step++;
          audio!.volume = Math.max(0, targetVol * (1 - step / steps));
          if (step >= steps) { clearInterval(t); audio!.pause(); audio!.currentTime = 0; }
        }, fade.duration / steps);
      }, fade.delay);
    }
  }, []);

  return play;
}
