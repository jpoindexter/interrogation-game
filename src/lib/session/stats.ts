import { calculateScore, getDetectiveRating, type Difficulty } from '../scoring';
import { resolvePlayMode, playModeRules } from './play-mode';
import { getSession } from './store';

export function getSessionStats(sessionId: string) {
  const session = getSession(sessionId);
  if (!session) return null;
  const difficulty = String(session.caseData.difficulty || 'medium') as Difficulty;
  const timeElapsed = session.startTime === 0 ? 0
    : Math.max(0, ((session.endedAt ?? Date.now()) - session.startTime) / 1000);
  const playMode = resolvePlayMode(session.timerMode, session.caseData.playMode);
  const { ranked, timeAffectsScore } = playModeRules(playMode);
  const wrongAccusations = session.accusationsUsed - (session.outcome === 'win' ? 1 : 0);
  const score = calculateScore({ elapsedSeconds: timeAffectsScore ? timeElapsed : 0, difficulty, hintsUsed: session.hintsUsed,
    wrongAccusations, questionsAsked: session.questionsAsked });
  return {
    timeElapsed, difficulty, playMode, ranked, hintsUsed: session.hintsUsed,
    accusationsUsed: session.accusationsUsed, questionsAsked: session.questionsAsked,
    score, detectiveRating: getDetectiveRating(score),
  };
}
