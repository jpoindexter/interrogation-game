interface ClockOptions {
  limit: number;
  unlimited: boolean;
  now?: () => number;
  active?: boolean;
}

/** Observable wall clock. Rendering and audio work never pause elapsed time. */
export function createGameClock({ limit, unlimited, now = Date.now, active = true }: ClockOptions) {
  let startedAt: number | null = null;
  let elapsed = 0;
  let expired = false;
  let expiry: (() => void) | null = null;
  const listeners = new Set<() => void>();
  const tick = () => {
    if (startedAt === null) return;
    const next = Math.max(0, Math.floor((now() - startedAt) / 1000));
    if (next !== elapsed) { elapsed = next; listeners.forEach(listener => listener()); }
    if (active && !unlimited && elapsed >= limit && !expired && expiry) {
      expired = true;
      expiry();
    }
  };
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => elapsed,
    start() { if (startedAt === null) startedAt = now(); tick(); },
    synchronize(serverStart: number) {
      if (!Number.isFinite(serverStart) || serverStart <= 0) return;
      startedAt = serverStart;
      if (now() - serverStart < limit * 1000) expired = false;
      tick();
    },
    setActive(value: boolean) { active = value; if (active) tick(); },
    tick,
    onExpire(callback: () => void) {
      expiry = callback;
      tick();
      return () => { if (expiry === callback) expiry = null; };
    },
    remaining: (seconds: number) => unlimited ? 0 : Math.max(0, limit - seconds),
  };
}
