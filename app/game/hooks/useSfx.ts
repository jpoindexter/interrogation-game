import { useRef, useCallback, useEffect } from 'react';

const SFX: Record<string, { src: string; vol: number }> = {
  // Foreground — UI interactions the player triggers directly
  click:        { src: '/efx/click.mp3',        vol: 0.4 },
  click_short:  { src: '/efx/click.mp3',        vol: 0.35 },
  paper:        { src: '/efx/paper.mp3',         vol: 0.3 },
  close:        { src: '/efx/close.mp3',         vol: 0.3 },
  typewriter:   { src: '/efx/typewriter.mp3',    vol: 0.2 },
  papershuffle: { src: '/efx/papershuffle.mp3',  vol: 0.3 },
  paperslide:   { src: '/efx/paperslide.mp3',    vol: 0.3 },
  paper_ruffle: { src: '/efx/paper_ruffle.mp3',  vol: 0.3 },
  paper_russle: { src: '/efx/paper_russle.mp3',   vol: 0.25 },
  book_close:   { src: '/efx/book_close.mp3',    vol: 0.3 },
  mic_on:       { src: '/efx/mic_on.mp3',        vol: 0.3 },
  mic_off:      { src: '/efx/mic_off.mp3',       vol: 0.3 },
  folderopen:   { src: '/efx/folderopen.mp3',    vol: 0.3 },
  tape_start:   { src: '/efx/tape_start.mp3',   vol: 0.4 },
  // Mid — dramatic events, feedback, results
  alarm:        { src: '/efx/alarm_sound_time_up.mp3', vol: 0.35 },
  wrong:        { src: '/efx/error_not_correct.mp3', vol: 0.3 },
  win:          { src: '/efx/win_sound.mp3',          vol: 0.35 },
  standing_up:  { src: '/efx/standing_up.mp3',        vol: 0.3 },
  door:         { src: '/efx/door_open_close.mp3',    vol: 0.25 },
  gameover:     { src: '/efx/gameover.mp3',            vol: 0.35 },
  chair_slide:  { src: '/efx/chair_slide.mp3',  vol: 0.25 },
  sigh:         { src: '/efx/sigh.mp3',          vol: 0.2 },
  slam:         { src: '/efx/slam.mp3',          vol: 0.3 },
  chime:        { src: '/efx/chime.mp3',         vol: 0.25 },
  error:        { src: '/efx/error.mp3',         vol: 0.2 },
  // Background — ambient texture, barely noticeable
  clock_tick:   { src: '/efx/clock_ticking.mp3', vol: 0.1 },
  nervous_1:    { src: '/efx/nervous_1.mp3',    vol: 0.12 },
  nervous_knock:{ src: '/efx/nervous_knocking.mp3', vol: 0.1 },
  nervous_tap:  { src: '/efx/nervous_tapping.mp3', vol: 0.1 },
  nervous_heel: { src: '/efx/nervous_heel_tapping.mp3', vol: 0.1 },
  nervous_foot: { src: '/efx/nervous_foottapping.mp3', vol: 0.1 },
  nervous_ac:   { src: '/efx/nervous_ac.mp3',          vol: 0.08 },
  nervous_cough_m: { src: '/efx/nervous_cough_man.mp3', vol: 0.12 },
  nervous_cough_f: { src: '/efx/nervous_cough_woman.mp3', vol: 0.12 },
  nervous_scratch: { src: '/efx/nervous_scratching.mp3', vol: 0.1 },
  female_sigh:  { src: '/efx/female_sigh.mp3',  vol: 0.12 },
  clothes_rustle:{ src: '/efx/clothes_russle.mp3', vol: 0.1 },
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
      paper_russle: { delay: 800, duration: 400 },
      book_close:   { delay: 600, duration: 200 },
      alarm:        { delay: 1800, duration: 500 },
      wrong:        { delay: 800, duration: 200 },
      win:          { delay: 1000, duration: 300 },
      standing_up:  { delay: 1800, duration: 500 },
      door:         { delay: 1200, duration: 400 },
      gameover:     { delay: 2000, duration: 500 },
      folderopen:   { delay: 400, duration: 300 },
      tape_start:   { delay: 800, duration: 400 },
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
      nervous_tap:    { delay: 1200, duration: 400 },
      nervous_heel:   { delay: 1200, duration: 400 },
      nervous_foot:   { delay: 1200, duration: 400 },
      nervous_ac:     { delay: 1200, duration: 400 },
      nervous_cough_m:{ delay: 1200, duration: 400 },
      nervous_cough_f:{ delay: 1200, duration: 400 },
      nervous_scratch:{ delay: 1200, duration: 400 },
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
