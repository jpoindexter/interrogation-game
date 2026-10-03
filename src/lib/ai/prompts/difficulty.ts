import { DIFFICULTY_CLUES } from '../../game-state';
import type { SuspectCase } from '../types';

export function difficultyContext(caseData: SuspectCase) {
  const difficulty = caseData.difficulty || 'medium';
  const clueCount = DIFFICULTY_CLUES[difficulty] || 3;

  const clueThresholds = Array.from({ length: clueCount }, (_, i) => {
    const stress = Math.round(2 + (i * 6) / Math.max(1, clueCount - 1));
    const isFirst = i === 0;
    const isLast = i === clueCount - 1;
    let desc: string;
    if (difficulty === 'easy') {
      desc = isFirst ? 'A helpful observation pointing toward the right area.'
        : isLast ? 'A clear hint about what doesn\'t add up in the story.'
        : 'A useful detail narrowing in on the weak point.';
    } else if (difficulty === 'hard' || difficulty === 'expert') {
      desc = isFirst ? 'A subtle environmental detail the detective notices. Does NOT point directly to the lie.'
        : isLast ? 'An observation that rewards careful cross-referencing, but does NOT state the contradiction directly.'
        : 'An ambiguous detail that could mean several things. Requires interpretation.';
    } else {
      desc = isFirst ? 'A vague observation about the right general area.'
        : isLast ? 'A pointed detail near the contradiction, but not stating it outright.'
        : 'A more specific detail that narrows the field of inquiry.';
    }
    return `- Clue ${i + 1} (when stress reaches ${stress}+): ${desc}`;
  }).join('\n');

  const difficultyBehavior = difficulty === 'easy'
    ? 'You are not great at lying. You get flustered easily and your deflections are weak.'
    : difficulty === 'hard'
    ? 'You are very composed and a skilled liar. You deflect smoothly, rarely show stress, and only crack under sustained, targeted pressure.'
    : difficulty === 'expert'
    ? 'You are an exceptional liar — manipulative, cold, and calculated. You actively misdirect, turn questions back on the detective, and show almost no stress until cornered with undeniable evidence.'
    : 'You are a decent liar but crack under sustained pressure.';

  return { difficulty, clueCount, clueThresholds, difficultyBehavior };
}
