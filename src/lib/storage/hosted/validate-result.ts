import type { GameSession } from '../../session/types';
import { calculateScore, getDetectiveRating, type Difficulty } from '../../scoring';
import { resolvePlayMode } from '../../session/play-mode';
import { check, count, record, text } from './validation';

function expectedStats(session: GameSession) {
  const difficulty = session.caseData.difficulty as Difficulty;
  const playMode = resolvePlayMode(session.timerMode, session.caseData.playMode);
  const timeElapsed = session.startTime === 0 ? 0 : (session.endedAt! - session.startTime) / 1000;
  const ranked = playMode === 'challenge';
  const score = calculateScore({ elapsedSeconds: ranked ? timeElapsed : 0, difficulty,
    hintsUsed: session.hintsUsed, questionsAsked: session.questionsAsked,
    wrongAccusations: session.accusationsUsed - (session.outcome === 'win' ? 1 : 0) });
  return { difficulty, playMode, timeElapsed, ranked, score, detectiveRating: getDetectiveRating(score),
    hintsUsed: session.hintsUsed, questionsAsked: session.questionsAsked, accusationsUsed: session.accusationsUsed };
}

function validateStats(value: unknown, session: GameSession): void {
  const stats = record(value);
  check(Object.entries(expectedStats(session)).every(([key, expected]) => stats[key] === expected));
}

function validateEvaluation(session: GameSession): void {
  if (session.evaluation === null) return;
  check(session.outcome !== null);
  const evaluation = record(session.evaluation);
  check(evaluation.outcome === session.outcome);
  validateStats(evaluation.stats, session);
  check(evaluation.detective_rating === expectedStats(session).detectiveRating);
  if (session.outcome === 'win') {
    check(evaluation.correct === true && evaluation.explanation === session.acceptedAccusation?.explanation);
    check(evaluation.reveal_the_lie === session.caseData.the_lie && evaluation.reveal_the_truth === session.caseData.the_truth);
    check(evaluation.reveal_the_clue === session.caseData.the_contradiction);
  } else {
    check(text(evaluation.closest_moment));
    check(evaluation.what_they_missed === session.caseData.the_contradiction);
    check(evaluation.the_lie_revealed === session.caseData.the_lie && evaluation.the_truth_revealed === session.caseData.the_truth);
  }
}

export function validateHostedResult(session: GameSession, value: unknown): void {
  validateEvaluation(session);
  if (value === undefined) return check(session.winToken === null);
  const token = record(value);
  check(session.outcome === 'win' && session.timerMode === 'countdown');
  check(typeof session.winToken === 'string' && /^[a-f0-9]{32}$/.test(session.winToken));
  check(count(token.issuedAt) && token.issuedAt >= session.endedAt! && typeof token.consumed === 'boolean');
  const snapshot = record(token.snapshot);
  validateStats(snapshot.stats, session);
  check(snapshot.caseNumber === session.caseData.case_number && snapshot.caseSetting === session.caseData.setting);
  check(snapshot.suspectName === session.caseData.suspect_name);
  check(snapshot.stressLevel === session.currentStress && snapshot.cluesFound === session.cluesCollected);
}
