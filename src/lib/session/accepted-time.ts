import type { GameSession } from './types';

/** Whole elapsed seconds when an exchange is accepted; not wall-clock epoch or speech duration. */
export function acceptedTimestamp(session: GameSession, now = Date.now()): number {
  if (!session.startTime) return 0;
  return Math.max(0, Math.floor(((session.endedAt ?? now) - session.startTime) / 1000));
}
