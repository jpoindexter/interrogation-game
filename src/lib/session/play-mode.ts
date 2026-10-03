export type PlayMode = 'challenge' | 'relaxed' | 'endurance';
export function isPlayMode(value: unknown): value is PlayMode {
  return value === 'challenge' || value === 'relaxed' || value === 'endurance';
}

/** Legacy sessions retain their original clock behavior without inheriting hidden pressure. */
export function resolvePlayMode(timerMode: unknown, playMode: unknown): PlayMode {
  return isPlayMode(playMode) ? playMode : timerMode === 'unlimited' ? 'relaxed' : 'challenge';
}
export function playModeRules(playMode: PlayMode) {
  return { ranked: playMode === 'challenge', timerMode: playMode === 'challenge' ? 'countdown' as const : 'unlimited' as const,
    timeAffectsScore: playMode === 'challenge' };
}
export function allowsLawyerEscalation(timerMode: unknown, playMode: unknown, difficulty: unknown): boolean {
  return resolvePlayMode(timerMode, playMode) === 'endurance' && (difficulty === 'hard' || difficulty === 'expert');
}

export function isRankedScore(stats: { playMode?: unknown; ranked?: unknown }): boolean {
  return stats.playMode === 'challenge' && stats.ranked === true;
}
