import { isSubstantiveQuestion, questionKey, recordReleaseProgress } from '../case-disclosure-policy';
import { acceptClue } from './transitions';
import type { GameSession } from './types';

export function hasReleasedCaseRecord(session: GameSession): boolean {
  return session.clues.some(clue => clue.origin === 'case-record');
}

/** Evidence availability depends on accepted questions, never model-reported stress. */
export function releaseCaseClue(session: GameSession, question: string): string | null {
  if (session.gameplay || hasReleasedCaseRecord(session) || !isSubstantiveQuestion(question)) return null;
  if (session.conversationHistory.some(message => message.role === 'user' && message.kind !== 'accusation'
    && questionKey(message.content) === questionKey(question))) return null;
  const progress = recordReleaseProgress(session.conversationHistory, String(session.caseData.difficulty));
  if (progress.asked + 1 < progress.required) return null;
  const record = String(session.caseData.the_contradiction ?? '').trim();
  if (!record) return null;
  return acceptClue(session, record, 'case-record') ? record : null;
}
