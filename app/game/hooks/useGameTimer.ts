import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { TIME_LIMITS } from '@/lib/game-state';
import { createGameClock } from '../state/game-clock';
export { TIME_LIMITS } from '@/lib/game-state';
interface SessionClock { startedAt?: number; sessionId?: string }

export function useGameTimer(phase: string, difficulty: string, timerMode = 'countdown', session: SessionClock = {}) {
  const isUnlimited = timerMode === 'unlimited';
  const timeLimit = isUnlimited ? 0 : (TIME_LIMITS[difficulty] || TIME_LIMITS.medium);
  const { startedAt = 0, sessionId } = session;
  const clock = useMemo(() => {
    void sessionId; // A different case gets an independent elapsed/expiry lifecycle.
    return createGameClock({ limit: timeLimit, unlimited: isUnlimited, active: false });
  }, [timeLimit, isUnlimited, sessionId]);
  const elapsed = useSyncExternalStore(clock.subscribe, clock.getSnapshot, () => 0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => { clock.synchronize(startedAt); }, [clock, startedAt]);
  useEffect(() => {
    const active = phase === 'active' || phase === 'processing';
    clock.setActive(active);
    if (!active) return;
    clock.start();
    const interval = setInterval(clock.tick, 250);
    timerRef.current = interval;
    window.addEventListener('focus', clock.tick);
    document.addEventListener('visibilitychange', clock.tick);
    return () => {
      clock.setActive(false);
      clearInterval(interval);
      if (timerRef.current === interval) timerRef.current = null;
      window.removeEventListener('focus', clock.tick);
      document.removeEventListener('visibilitychange', clock.tick);
    };
  }, [phase, clock]);
  return { remaining: clock.remaining(elapsed), elapsed, timeLimit, timerRef,
    onExpire: clock.onExpire, synchronize: clock.synchronize, isUnlimited };
}
