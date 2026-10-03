import { isRankedScore, playModeRules } from '../../../src/lib/session/play-mode';
import type { ResultStats } from './types';

const labels = { challenge: 'Timed challenge', relaxed: 'Relaxed', endurance: 'Endurance' };
export function resultModePresentation(stats: ResultStats) {
  if (!stats.playMode || stats.ranked === undefined) {
    return { label: 'Mode not recorded', ranking: 'Ranking is unavailable for this older result.', timeAffectsScore: null };
  }
  return { label: labels[stats.playMode], ranking: stats.ranked ? 'Ranked challenge' : 'Unranked practice',
    timeAffectsScore: playModeRules(stats.playMode).timeAffectsScore };
}
export function canRankResult(stats: ResultStats): boolean {
  return isRankedScore(stats);
}
