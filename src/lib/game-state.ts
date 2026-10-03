/** Wall-clock gameplay duration, starting at Begin; provider and audio time count. */
export const TIME_LIMITS: Record<string, number> = { easy: 300, medium: 420, hard: 540, expert: 600 };

/** Difficulty → minimum clues required. Single source of truth. */
export const DIFFICULTY_CLUES: Record<string, number> = {
  easy: 2, medium: 3, hard: 4, expert: 5,
};

/** Case data as returned to the client (secrets stripped) */
export interface Case {
  case_number: string;
  setting: string;
  crime: string;
  objective: string;
  briefing: string;
  detective_leads?: string[];
  suspect_name: string;
  suspect_gender: string;
  portraitId?: import('./art/portraits').PortraitId;
  suspect_role: string;
  suspect_cover_story: string;
  difficulty: string;
  sessionId: string;
  mode?: 'redteam';
  playMode?: 'challenge' | 'relaxed' | 'endurance';
  requiredClues?: number;
  gameplay?: import('./gameplay/projection').PublicGameplayProjection;
  timerMode?: 'countdown' | 'unlimited';
  startedAt?: number;
  // stress_triggers are now server-only — hints fetched via /api/hint
}

/** Full case data (server-side only, includes secrets) */
export interface FullCase extends Case {
  suspect_true_story: string;
  the_lie: string;
  the_truth: string;
  the_contradiction: string;
  deflection_tactics: string[];
}
