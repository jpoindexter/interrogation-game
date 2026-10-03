export interface LeaderboardEntry {
  id: string | number;
  player_name: string;
  suspect_name: string;
  case_setting: string;
  score: number;
  time_remaining: number;
  detective_rating: string;
}
function finiteNumber(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function entry(value: unknown): LeaderboardEntry {
  if (!value || typeof value !== 'object') throw new Error('Invalid leaderboard record');
  const row = value as Record<string, unknown>;
  if (!['string', 'number'].includes(typeof row.id) || typeof row.player_name !== 'string'
    || !finiteNumber(row.score) || !finiteNumber(row.time_remaining)) {
    throw new Error('Invalid leaderboard record');
  }
  return { id: row.id as string | number, player_name: row.player_name, score: row.score,
    time_remaining: row.time_remaining, suspect_name: String(row.suspect_name || 'Unknown suspect'),
    case_setting: String(row.case_setting || 'Unknown setting'), detective_rating: String(row.detective_rating || 'Not rated') };
}
export function readLeaderboard(value: unknown): LeaderboardEntry[] {
  if (!value || typeof value !== 'object' || !('leaderboard' in value) || !Array.isArray(value.leaderboard)) {
    throw new Error('Invalid leaderboard response');
  }
  return value.leaderboard.map(entry).sort((a, b) => b.score - a.score).slice(0, 20);
}
export function rankBadge(index: number) {
  return [{ label: '1ST', color: 'text-gold' }, { label: '2ND', color: 'text-gray-200' },
    { label: '3RD', color: 'text-bronze' }][index] || { label: String(index + 1), color: 'text-gray-300' };
}
