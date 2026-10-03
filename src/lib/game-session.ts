import { getSession } from './session/store';
import { requireActive } from './session/transitions';
export { DIFFICULTY_CLUES } from './game-state';
export type { GameSession } from './session/types';
export { createSession, getSession, deleteSession, acquireSessionLock, releaseSessionLock } from './session/store';
export { getSessionStats } from './session/stats';
export { issueWinToken, getWinTokenStats, consumeWinToken } from './session/tokens';
export { exportSession } from './session/export';

export function addMessage(sessionId: string, role: 'user' | 'assistant', content: string): void {
  const session = getSession(sessionId);
  if (!session) return;
  session.conversationHistory.push({ role, content });
}

export function incrementHint(sessionId: string): number {
  const session = getSession(sessionId);
  if (!session) return 0;
  requireActive(session);
  session.hintsUsed += 1;
  return session.hintsUsed;
}

export function updateStress(sessionId: string, stress: number): void {
  const session = getSession(sessionId);
  if (!session || !Number.isFinite(stress)) return;
  session.currentStress = Math.max(0, Math.min(9, Math.floor(stress)));
}

export function updateHighStressStreak(sessionId: string, stress: number): boolean {
  const session = getSession(sessionId);
  if (!session) return false;
  session.highStressStreak = stress >= 8 ? session.highStressStreak + 1 : 0;
  return session.highStressStreak >= 4;
}

export { sanitizeCaseForClient } from './session/public-case';
