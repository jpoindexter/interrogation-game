import { useState, useEffect, useRef, useCallback } from 'react';

// Time limits in seconds per difficulty
export const TIME_LIMITS: Record<string, number> = {
  easy: 300,    // 5 min
  medium: 420,  // 7 min
  hard: 540,    // 9 min
  expert: 600,  // 10 min
};

export function useGameTimer(phase: string, isSpeaking: boolean, difficulty: string) {
  const timeLimit = TIME_LIMITS[difficulty] || 420;
  const [remaining, setRemaining] = useState(timeLimit);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onExpireRef = useRef<(() => void) | null>(null);

  // Reset when difficulty/timeLimit changes (new game)
  useEffect(() => { setRemaining(timeLimit); }, [timeLimit]);

  useEffect(() => {
    if (phase !== 'active' && phase !== 'processing') return;

    const shouldTick = phase === 'active' && !isSpeaking;
    if (!shouldTick) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }

    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          onExpireRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, isSpeaking]);

  const onExpire = useCallback((cb: () => void) => { onExpireRef.current = cb; }, []);

  // Elapsed time (for scoring) = timeLimit - remaining
  const elapsed = timeLimit - remaining;

  return { remaining, elapsed, timeLimit, timerRef, onExpire };
}
