import { PAR_QUESTIONS } from '../../../src/lib/scoring';
import { resultModePresentation } from './mode-presentation';
import type { ResultStats } from './types';
const difficultyLabels = {
  easy: { parTime: 240, multiplier: 1, label: 'Easy' },
  medium: { parTime: 360, multiplier: 1.5, label: 'Medium' },
  hard: { parTime: 480, multiplier: 2, label: 'Hard' },
  expert: { parTime: 600, multiplier: 2.5, label: 'Expert' },
};
export function computeBreakdown(stats: ResultStats) {
  const diff = difficultyLabels[stats.difficulty];
  const parQuestions = PAR_QUESTIONS[stats.difficulty];
  const questions = Math.max(1, stats.questionsAsked);
  const mode = resultModePresentation(stats);
  const scoreElapsed = mode.timeAffectsScore ? stats.timeElapsed : 0;
  const wrongAccusations = Math.max(0, stats.accusationsUsed - 1);
  return {
    diff, mode, diffMultiplier: diff.multiplier, timeScore: mode.timeAffectsScore === null ? null
      : Math.round(1000 * Math.sqrt(Math.max(0, 1 - scoreElapsed / (diff.parTime * 2)))),
    questionsAsked: stats.questionsAsked, parQuestions,
    efficiencyMultiplier: questions >= parQuestions ? 1 : 1 + 0.5 * ((parQuestions - questions) / (parQuestions - 1)),
    hintsUsed: stats.hintsUsed, hintMultiplier: Math.pow(0.85, stats.hintsUsed),
    wrongAccusations, accusationMultiplier: Math.max(0, 1 - wrongAccusations * 0.1), finalScore: stats.score,
  };
}
