import { useRef, useCallback, useEffect } from 'react';

const SFX: Record<string, { src: string; vol: number }> = {
  // UI — short, crisp, quiet
  click:        { src: '/efx/click.mp3',        vol: 0.15 },
  click_short:  { src: '/efx/click.mp3',        vol: 0.12 },
  paper:        { src: '/efx/paper.mp3',         vol: 0.12 },
  close:        { src: '/efx/close.mp3',         vol: 0.12 },
  typewriter:   { src: '/efx/typewriter.mp3',    vol: 0.12 },
  papershuffle: { src: '/efx/papershuffle.mp3',  vol: 0.12 },
  paperslide:   { src: '/efx/paperslide.mp3',    vol: 0.12 },
  paper_ruffle: { src: '/efx/paper_ruffle.mp3',  vol: 0.12 },
  mic_on:       { src: '/efx/mic_on.mp3',        vol: 0.15 },
  mic_off:      { src: '/efx/mic_off.mp3',       vol: 0.15 },
  folderopen:   { src: '/efx/folderopen.mp3',    vol: 0.15 },
  // Dramatic — punchier but still controlled
  chair_slide:  { src: '/efx/chair_slide.mp3',  vol: 0.18 },
  sigh:         { src: '/efx/sigh.mp3',          vol: 0.15 },
  slam:         { src: '/efx/slam.mp3',          vol: 0.22 },
  chime:        { src: '/efx/chime.mp3',         vol: 0.15 },
  error:        { src: '/efx/error.mp3',         vol: 0.12 },
  // Ambient — very subtle, background texture
  clock_tick:   { src: '/efx/clock_ticking.mp3', vol: 0.06 },
  nervous_1:    { src: '/efx/nervous_1.mp3',    vol: 0.08 },
  nervous_knock:{ src: '/efx/nervous_knocking.mp3', vol: 0.07 },
  female_sigh:  { src: '/efx/female_sigh.mp3',  vol: 0.08 },
  clothes_rustle:{ src: '/efx/clothes_russle.mp3', vol: 0.07 },
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
      const peakVol = 0.12 * masterVol;
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

    // Fade-out configs: delay = play time before fade starts, duration = fade length
    const fadeConfig: Record<string, { delay: number; duration: number }> = {
      // UI clicks — snap cut
      click_short: { delay: 60, duration: 120 },
      // Paper / folder — short rustle then gone
      paper:        { delay: 300, duration: 250 },
      papershuffle: { delay: 350, duration: 300 },
      paperslide:   { delay: 300, duration: 250 },
      paper_ruffle: { delay: 300, duration: 250 },
      folderopen:   { delay: 400, duration: 300 },
      // Mic — quick blip
      mic_on:       { delay: 200, duration: 200 },
      mic_off:      { delay: 200, duration: 200 },
      // Dramatic — a beat then out
      chair_slide:  { delay: 400, duration: 350 },
      sigh:         { delay: 500, duration: 400 },
      slam:         { delay: 300, duration: 350 },
      chime:        { delay: 400, duration: 500 },
      error:        { delay: 200, duration: 300 },
      // Ambient — very short, barely there
      clock_tick:     { delay: 400, duration: 300 },
      nervous_1:      { delay: 400, duration: 300 },
      nervous_knock:  { delay: 350, duration: 300 },
      female_sigh:    { delay: 450, duration: 350 },
      clothes_rustle: { delay: 350, duration: 300 },
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
