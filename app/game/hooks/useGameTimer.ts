import { useState, useEffect, useRef, useCallback } from 'react';

// Time limits in seconds per difficulty (countdown mode)
export const TIME_LIMITS: Record<string, number> = {
  easy: 300,    // 5 min
  medium: 420,  // 7 min
  hard: 540,    // 9 min
  expert: 600,  // 10 min
};

/** Read timer mode from localStorage (settings page writes it) */
function getTimerMode(): 'countdown' | 'unlimited' {
  if (typeof window === 'undefined') return 'countdown';
  try {
    const s = localStorage.getItem('appSettings');
    if (s) {
      const parsed = JSON.parse(s);
      if (parsed.timerMode === 'unlimited') return 'unlimited';
    }
  } catch { /* ignore */ }
  return 'countdown';
}

export function useGameTimer(phase: string, isSpeaking: boolean, difficulty: string) {
  const timerMode = getTimerMode();
  const isUnlimited = timerMode === 'unlimited';
  const timeLimit = isUnlimited ? 0 : (TIME_LIMITS[difficulty] || 420);
  const [remaining, setRemaining] = useState(isUnlimited ? 0 : timeLimit);
  const [elapsedUp, setElapsedUp] = useState(0); // count-up for unlimited mode
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onExpireRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isUnlimited) { setElapsedUp(0); } else { setRemaining(timeLimit); }
  }, [timeLimit, isUnlimited]);

  useEffect(() => {
    if (phase !== 'active' && phase !== 'processing') return;

    const shouldTick = phase === 'active' && !isSpeaking;
    if (!shouldTick) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }

    if (isUnlimited) {
      timerRef.current = setInterval(() => {
        setElapsedUp((prev) => prev + 1);
      }, 1000);
    } else {
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
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, isSpeaking, isUnlimited]);

  const onExpire = useCallback((cb: () => void) => { onExpireRef.current = cb; }, []);

  const elapsed = isUnlimited ? elapsedUp : (timeLimit - remaining);

  return { remaining, elapsed, timeLimit, timerRef, onExpire, isUnlimited };
}
