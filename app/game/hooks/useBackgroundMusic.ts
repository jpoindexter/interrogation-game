import { useRef, useEffect } from 'react';

export function useBackgroundMusic(src: string, volume = 0.12, enabled = true) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  useEffect(() => {
    if (!enabled) {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; audioRef.current = null; }
      return;
    }

    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = volumeRef.current;
    audioRef.current = audio;

    const tryPlay = () => audio.play().catch(() => {});
    tryPlay();
    const handler = () => { tryPlay(); document.removeEventListener('click', handler); };
    document.addEventListener('click', handler);

    return () => {
      document.removeEventListener('click', handler);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [src, enabled]);

  // Update volume dynamically without recreating audio
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);
}
