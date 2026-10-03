import type { Difficulty } from '../../../src/lib/scoring';
export type ResultKind = 'win' | 'lose';
export interface GameResult {
  caseData: { case_number: string; suspect_name: string; suspect_role: string; setting: string; crime: string; difficulty?: string; portraitId?: string; mode?: 'redteam' };
  sessionId?: string;
  winToken?: string;
  conversationHistory: Array<{ role: string; content: string }>;
  confession?: string;
  timeElapsed?: number;
  difficulty?: string;
  stressLevel?: number;
  maxStress?: number;
  gaveUp?: boolean;
  timeUp?: boolean;
  lawyeredUp?: boolean;
  timeUpRemark?: string;
  cleverRemark?: string;
}
export interface ResultStats {
  playMode?: import('../../../src/lib/session/play-mode').PlayMode;
  ranked?: boolean;
  timeElapsed: number; difficulty: Difficulty; hintsUsed: number;
  accusationsUsed: number; questionsAsked: number; score: number; detectiveRating: string;
}
export interface Evaluation {
  conversationPath?: import('./conversation-path').ConversationPathNode[];
  outcome: 'win' | 'lose_accusations' | 'lose_time' | 'lose_giveup' | 'lose_lawyer';
  stats: ResultStats;
  detective_rating: string;
  reveal_the_lie?: string;
  reveal_the_truth?: string;
  reveal_the_clue?: string;
  the_lie_revealed?: string;
  the_truth_revealed?: string;
  closest_moment?: string;
  what_they_missed?: string;
}
export interface LeaderboardReceipt { success: true; id: string | number; score: number; playerName?: string }
