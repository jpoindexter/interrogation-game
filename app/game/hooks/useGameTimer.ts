import { useState, useEffect, useRef } from 'react';

export function useGameTimer(phase: string, isSpeaking: boolean) {
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (phase !== 'active' && phase !== 'processing') return;

    const shouldTick = phase === 'active' && !isSpeaking;
    if (!shouldTick) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, isSpeaking]);

  return { timer, timerRef };
}
