import { DIFFICULTY_CLUES, TIME_LIMITS } from '../game-state';
import type { Clue, GameSession, Outcome } from './types';

export function beginSession(session: GameSession, now = Date.now()): void {
  if (session.status !== 'briefing') return;
  session.status = 'active';
  session.startTime = now;
}

export function finishSession(session: GameSession, outcome: Outcome, now = Date.now()): void {
  if (session.outcome) return;
  session.outcome = outcome;
  if (session.gameplay) session.gameplay.status = 'ended';
  session.status = outcome === 'win' ? 'won' : 'lost';
  session.endedAt = now;
}

export function expireSession(session: GameSession, now = Date.now()): boolean {
  if (session.status !== 'active' || session.timerMode === 'unlimited') return false;
  const difficulty = String(session.caseData.difficulty);
  const deadline = session.startTime + (TIME_LIMITS[difficulty] ?? TIME_LIMITS.medium) * 1000;
  if (now < deadline) return false;
  finishSession(session, 'lose_time', deadline);
  return true;
}

export function requireActive(session: GameSession): void {
  expireSession(session);
  if (session.status !== 'active') throw new Error('This interrogation is not active');
}

function clueKey(text: string): string {
  return text.normalize('NFKC').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function acceptClue(session: GameSession, text: string, origin?: Clue['origin']): string | null {
  const key = clueKey(text);
  const max = DIFFICULTY_CLUES[String(session.caseData.difficulty)] ?? 3;
  // Legacy sessions may already have their old model-clue quota; allow one canonical record without deleting history.
  if (!key || (session.clues.length >= max && origin !== 'case-record')
    || session.clues.some(clue => clueKey(clue.text) === key || (origin === 'case-record' && clue.origin === origin))) return null;
  const id = `clue-${session.clues.length + 1}`;
  session.clues.push({ id, text: text.trim(), ...(origin ? { origin } : {}) });
  session.cluesCollected = session.clues.length;
  return id;
}

export function commitAccusation(
  session: GameSession, text: string, result: { correct: boolean; explanation: string },
): void {
  requireActive(session);
  session.accusationsUsed += 1;
  session.accusationsLeft -= 1;
  if (result.correct) {
    session.acceptedAccusation = { text, explanation: result.explanation };
    finishSession(session, 'win');
  } else if (session.accusationsLeft === 0) finishSession(session, 'lose_accusations');
}
