export interface LeaderboardEntry {
  player_name: string;
  case_setting: string;
  suspect_name: string;
  time_remaining: number;
  detective_rating: string;
  score: number;
  clues_found: number;
  hints_used: number;
  accusations_used: number;
  created_at: string;
}

export const SEED_ENTRIES: LeaderboardEntry[] = [
  { player_name: 'DNR', case_setting: 'Police Precinct', suspect_name: 'Sgt. Marcus Webb', time_remaining: 240, detective_rating: 'Legendary', score: 2384, clues_found: 5, hints_used: 0, accusations_used: 1, created_at: '2026-02-28T09:12:00Z' },
  { player_name: 'CCK', case_setting: 'Trading Floor', suspect_name: 'Elena Marchetti', time_remaining: 180, detective_rating: 'Legendary', score: 2062, clues_found: 4, hints_used: 0, accusations_used: 1, created_at: '2026-02-28T08:45:00Z' },
  { player_name: 'TSK', case_setting: 'Tech Company', suspect_name: 'Raj Patel', time_remaining: 300, detective_rating: 'Veteran', score: 1530, clues_found: 4, hints_used: 1, accusations_used: 1, created_at: '2026-02-28T07:30:00Z' },
  { player_name: 'BCG', case_setting: 'Hospital', suspect_name: 'Dr. Linda Zhao', time_remaining: 240, detective_rating: 'Veteran', score: 1275, clues_found: 3, hints_used: 0, accusations_used: 2, created_at: '2026-02-28T06:15:00Z' },
  { player_name: 'ITX', case_setting: 'Law Firm', suspect_name: 'James Whitfield', time_remaining: 280, detective_rating: 'Sharp', score: 1060, clues_found: 3, hints_used: 1, accusations_used: 1, created_at: '2026-02-27T22:00:00Z' },
  { player_name: 'LD9', case_setting: 'Corporate Office', suspect_name: 'Karen Sullivan', time_remaining: 180, detective_rating: 'Sharp', score: 866, clues_found: 2, hints_used: 0, accusations_used: 1, created_at: '2026-02-27T20:30:00Z' },
  { player_name: 'NSH', case_setting: 'Startup', suspect_name: 'Tyler Brooks', time_remaining: 200, detective_rating: 'Sharp', score: 764, clues_found: 2, hints_used: 1, accusations_used: 1, created_at: '2026-02-27T19:00:00Z' },
  { player_name: 'CLJ', case_setting: 'Police Precinct', suspect_name: 'Officer Diane Holt', time_remaining: 520, detective_rating: 'Rookie', score: 614, clues_found: 5, hints_used: 2, accusations_used: 2, created_at: '2026-02-27T17:45:00Z' },
  { player_name: 'QRM', case_setting: 'Trading Floor', suspect_name: 'Victor Tan', time_remaining: 600, detective_rating: 'Rookie', score: 478, clues_found: 4, hints_used: 3, accusations_used: 2, created_at: '2026-02-27T16:00:00Z' },
  { player_name: 'FTR', case_setting: 'Startup', suspect_name: 'Amy Chen', time_remaining: 380, detective_rating: 'Trainee', score: 312, clues_found: 2, hints_used: 3, accusations_used: 3, created_at: '2026-02-27T14:30:00Z' },
];
