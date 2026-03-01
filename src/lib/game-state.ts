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
  suspect_role: string;
  suspect_cover_story: string;
  difficulty: string;
  sessionId: string;
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
