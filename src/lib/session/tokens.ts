import { randomBytes, timingSafeEqual } from 'crypto';
import { getSession, getSessionRecord, acquireSessionLock, releaseSessionLock } from './store';
import { isRankedScore } from './play-mode';
import { getSessionStats } from './stats';

export interface WinSnapshot {
  stats: NonNullable<ReturnType<typeof getSessionStats>>;
  caseNumber: string;
  caseSetting: string;
  suspectName: string;
  stressLevel: number;
  cluesFound: number;
}
const TTL = 30 * 60 * 1000;

export function issueWinToken(sessionId: string): string | null {
  const session = getSession(sessionId);
  const stats = getSessionStats(sessionId);
  if (!session || session.outcome !== 'win' || session.winToken || !stats?.ranked) return null;
  const token = randomBytes(16).toString('hex');
  session.winToken = token;
  const facts = session.caseData;
  const snapshot = { stats: { ...stats }, caseNumber: String(facts.case_number || ''),
    caseSetting: String(facts.setting || ''), suspectName: String(facts.suspect_name || ''),
    stressLevel: session.currentStress, cluesFound: session.cluesCollected };
  getSessionRecord(sessionId)!.token = { issuedAt: Date.now(), snapshot, consumed: false };
  return token;
}
export function getWinTokenStats(sessionId: string): WinSnapshot['stats'] | null {
  const entry = getSessionRecord(sessionId)?.token;
  return entry && isRankedScore(entry.snapshot.stats) && !entry.consumed && Date.now() - entry.issuedAt <= TTL ? { ...entry.snapshot.stats } : null;
}
export function inspectWinToken(sessionId: string, token: string): WinSnapshot | null {
  const entry = getSessionRecord(sessionId)?.token;
  if (!entry || entry.consumed || Date.now() - entry.issuedAt > TTL || !/^[a-f0-9]{32}$/.test(token)) return null;
  if (!isRankedScore(entry.snapshot.stats)) return null;
  const expected = getSessionRecord(sessionId)?.session.winToken;
  if (!expected || !timingSafeEqual(Buffer.from(expected), Buffer.from(token))) return null;
  return structuredClone(entry.snapshot);
}

/** Commit only after an idempotent durable leaderboard write has been confirmed. */
export function consumeWinToken(sessionId: string, token: string): boolean {
  if (!acquireSessionLock(sessionId)) return false;
  try {
    if (!inspectWinToken(sessionId, token)) return false;
    getSessionRecord(sessionId)!.token!.consumed = true;
    return true;
  } finally { releaseSessionLock(sessionId); }
}
