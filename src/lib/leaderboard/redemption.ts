import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { isRankedScore } from '../session/play-mode';
import { consumeWinToken, inspectWinToken, type WinSnapshot } from '../session/tokens';
import { isRankedRow, LeaderboardError, type LeaderboardRow, type LeaderboardStore } from './types';

interface Submission { sessionId: string; winToken: string; playerName: string }
interface TokenAuthority {
  inspect: (sessionId: string, token: string) => WinSnapshot | null;
  consume: (sessionId: string, token: string) => boolean;
}
const tokens: TokenAuthority = { inspect: inspectWinToken, consume: consumeWinToken };
function tokenHash(token: string): string { return createHash('sha256').update(token).digest('hex'); }
export function validateSubmission(value: unknown): Submission {
  if (!value || typeof value !== 'object') throw new LeaderboardError('Invalid submission', 400);
  const input = value as Record<string, unknown>;
  if (typeof input.sessionId !== 'string' || !/^[a-f0-9]{48}$/.test(input.sessionId)
    || typeof input.winToken !== 'string' || !/^[a-f0-9]{32}$/.test(input.winToken)) {
    throw new LeaderboardError('Invalid or expired win token', 401);
  }
  if (typeof input.playerName !== 'string' || !/^[A-Za-z0-9]{1,3}$/.test(input.playerName)) {
    throw new LeaderboardError('Initials must contain 1–3 letters or numbers', 400);
  }
  return { sessionId: input.sessionId, winToken: input.winToken, playerName: input.playerName.toUpperCase() };
}
function receipt(row: LeaderboardRow, token: string) {
  if (!isRankedRow(row)) throw new LeaderboardError('Only verified timed challenge scores are ranked.', 409);
  const hash = tokenHash(token);
  if (!/^[a-f0-9]{64}$/.test(row.redemption_hash)
    || !timingSafeEqual(Buffer.from(row.redemption_hash), Buffer.from(hash))) {
    throw new LeaderboardError('Invalid or expired win token', 401);
  }
  return { success: true as const, id: row.id, score: row.score, playerName: row.player_name };
}
function canonicalRow(submission: Submission, snapshot: WinSnapshot): LeaderboardRow {
  const { stats } = snapshot;
  if (!isRankedScore(stats)) throw new LeaderboardError('Only timed challenge scores can be ranked.', 409);
  return { id: randomUUID(), session_id: submission.sessionId, redemption_hash: tokenHash(submission.winToken),
    play_mode: stats.playMode, ranked: stats.ranked, player_name: submission.playerName, case_number: snapshot.caseNumber, case_setting: snapshot.caseSetting,
    suspect_name: snapshot.suspectName, time_remaining: stats.timeElapsed, difficulty: stats.difficulty,
    stress_level: snapshot.stressLevel, clues_found: snapshot.cluesFound, hints_used: stats.hintsUsed,
    accusations_used: stats.accusationsUsed, questions_asked: stats.questionsAsked,
    detective_rating: stats.detectiveRating, score: stats.score, created_at: new Date().toISOString() };
}

export async function redeemWin(body: unknown, store: LeaderboardStore, authority: TokenAuthority = tokens) {
  const submission = validateSubmission(body);
  const existing = await store.find(submission.sessionId);
  if (existing) return receipt(existing, submission.winToken);
  const snapshot = authority.inspect(submission.sessionId, submission.winToken);
  if (!snapshot) {
    const concurrent = await store.find(submission.sessionId);
    if (concurrent) return receipt(concurrent, submission.winToken);
    throw new LeaderboardError('Invalid or expired win token', 401);
  }
  const saved = await store.insert(canonicalRow(submission, snapshot));
  const confirmed = receipt(saved, submission.winToken);
  authority.consume(submission.sessionId, submission.winToken);
  return confirmed;
}
