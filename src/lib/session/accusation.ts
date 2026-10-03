import { acceptedTimestamp } from './accepted-time';
import { sanitizeAccusationResponse } from '../game-ai/sanitize-response';
import { commitAccusation, requireActive } from './transitions';
import { issueWinToken } from './tokens';
import { getSessionStats } from './stats';
import { sessionProjection } from './turn';
import type { GameSession } from './types';

export function accusationError(session: GameSession): string | null {
  try { requireActive(session); } catch { return 'This interrogation has ended or has not begun'; }
  if (session.gameplay && session.gameplay.establishedContradictionIds.length === 0) return 'Establish a contradiction using a pinned statement and an exhibit first.';
  if (session.accusationsLeft <= 0) return 'No accusations remaining';
  return null;
}

export async function judgeAccusation(
  session: GameSession, text: string, judge: () => Promise<Record<string, unknown>>,
){
  const error = accusationError(session);
  if (error) throw new Error(error);
  const raw = await judge();
  const result = sanitizeAccusationResponse(raw);
  const judgment = { correct: result.correct === true, explanation: String(result.explanation) };
  // Nothing is consumed until a valid judgment arrives and deadline is rechecked.
  commitAccusation(session, text, judgment);
  const timestamp = acceptedTimestamp(session);
  session.conversationHistory.push({ role: 'user', kind: 'accusation', accusationAttempt: session.accusationsUsed, content: `[ACCUSATION] ${text}`, timestamp },
    { role: 'assistant', content: String(result.confession), timestamp });
  const winToken = judgment.correct ? issueWinToken(session.id) : null;
  return { ...result, accusationsLeft: session.accusationsLeft,
    ...(winToken ? { winToken } : {}), ...sessionProjection(session), stats: getSessionStats(session.id) };
}
