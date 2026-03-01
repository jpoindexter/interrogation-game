import { useRef, useCallback, useEffect } from 'react';

const SFX = {
  click: '/efx/click.wav',
  paper: '/efx/paper.wav',
  close: '/efx/close.wav',
  typewriter: '/efx/typewriter.wav',
  papershuffle: '/efx/papershuffle.wav',
} as const;

export type SfxName = keyof typeof SFX;

export function useSfx() {
  const cache = useRef<Map<string, HTMLAudioElement>>(new Map());
  const muted = useRef(false);

  // Sync mute state with music volume (sfx off when music is off)
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
    const src = SFX[name];
    let audio = cache.current.get(src);
    if (!audio) {
      audio = new Audio(src);
      cache.current.set(src, audio);
    }
    audio.currentTime = 0;
    audio.volume = 0.3;
    audio.play().catch(() => {});
  }, []);

  return play;
}
