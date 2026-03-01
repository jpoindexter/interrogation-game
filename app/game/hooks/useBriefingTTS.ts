import { useState, useEffect, useRef, useCallback } from 'react';
import { getVoiceVolume } from './useTTS';
import { getUserApiHeaders } from '../../lib/api-keys';

export function useBriefingTTS(
  active: boolean,
  fullText: string,
  caseData: { suspect_name: string; suspect_gender: string; sessionId?: string },
) {
  const [charIndex, setCharIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    setCharIndex(0);
    setIsPlaying(true);

    let cancelled = false;
    const play = async () => {
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getUserApiHeaders() },
          body: JSON.stringify({ text: fullText, stress: 0, suspectName: caseData.suspect_name, suspectGender: caseData.suspect_gender, sessionId: caseData.sessionId, role: 'detective' }),
        });
        if (cancelled) return;
        if (!res.ok) throw new Error('TTS failed');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.volume = getVoiceVolume();
        audioRef.current = audio;

        const tick = () => {
          if (!audioRef.current || cancelled) return;
          const progress = audio.currentTime / audio.duration;
          setCharIndex(Math.floor(progress * fullText.length));
          rafRef.current = requestAnimationFrame(tick);
        };

        const cleanup = () => {
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          URL.revokeObjectURL(url);
          audioRef.current = null;
          setIsPlaying(false);
          setCharIndex(fullText.length);
        };
        audio.onended = cleanup;
        audio.onerror = cleanup;
        await audio.play();
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        if (!cancelled) { setIsPlaying(false); setCharIndex(fullText.length); }
      }
    };
    play();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, [active]);

  const skip = useCallback(() => {
    setCharIndex(fullText.length);
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setIsPlaying(false);
  }, [fullText.length]);

  const stop = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setIsPlaying(false);
  }, []);

  return { charIndex, isPlaying, skip, stop };
}
