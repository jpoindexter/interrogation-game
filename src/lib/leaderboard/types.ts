export interface LeaderboardRow {
  id: string;
  play_mode?: 'challenge' | 'relaxed' | 'endurance';
  ranked?: boolean;
  session_id: string;
  redemption_hash: string;
  player_name: string;
  case_number: string;
  case_setting: string;
  suspect_name: string;
  time_remaining: number;
  difficulty: string;
  stress_level: number;
  clues_found: number;
  hints_used: number;
  accusations_used: number;
  questions_asked: number;
  detective_rating: string;
  score: number;
  created_at: string;
}
export type PublicLeaderboardRow = Omit<LeaderboardRow, 'session_id' | 'redemption_hash'>;
export interface LeaderboardStore {
  find: (sessionId: string) => Promise<LeaderboardRow | null>;
  insert: (row: LeaderboardRow) => Promise<LeaderboardRow>;
  list: () => Promise<PublicLeaderboardRow[]>;
}
export function isRankedRow(row: LeaderboardRow): boolean {
  return row.play_mode === 'challenge' && row.ranked === true;
}
export function publicLeaderboardRow(row: LeaderboardRow): PublicLeaderboardRow {
  const { session_id, redemption_hash, ...publicFields } = row;
  void session_id;
  void redemption_hash;
  return publicFields;
}
export class LeaderboardError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
