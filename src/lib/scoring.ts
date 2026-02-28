export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

const DIFFICULTY_CONFIG = {
  easy:   { parTime: 240, multiplier: 1.0 },
  medium: { parTime: 360, multiplier: 1.5 },
  hard:   { parTime: 480, multiplier: 2.0 },
  expert: { parTime: 600, multiplier: 2.5 },
} as const;

/**
 * Calculate score using sqrt curve for time, difficulty multiplier,
 * multiplicative hint penalty, and flat accusation penalty.
 *
 * Time: sqrt curve against per-difficulty par time (0 at 2x par)
 * Hints: 15% multiplicative penalty each (0.85^n)
 * Wrong accusations: 10% flat penalty each
 * Difficulty: multiplier on final score
 */
export function calculateScore(
  elapsedSeconds: number,
  difficulty: Difficulty,
  hintsUsed: number,
  wrongAccusations: number,
): number {
  const { parTime, multiplier } = DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG.medium;

  // Time score: 0–1000 base. Zero at 2x par, 707 at par, 1000 at instant.
  const timeRatio = Math.max(0, 1 - elapsedSeconds / (parTime * 2));
  const timeScore = 1000 * Math.sqrt(timeRatio);

  // Hint penalty: 15% multiplicative per hint
  const hintMultiplier = Math.pow(0.85, hintsUsed);

  // Accusation penalty: 10% flat per wrong accusation
  const accusationMultiplier = Math.max(0, 1 - wrongAccusations * 0.1);

  return Math.round(Math.max(0, timeScore * multiplier * hintMultiplier * accusationMultiplier));
}

export function getDetectiveRating(score: number): string {
  if (score >= 2000) return 'Legendary';
  if (score >= 1200) return 'Veteran';
  if (score >= 800) return 'Sharp';
  if (score >= 400) return 'Rookie';
  return 'Trainee';
}
