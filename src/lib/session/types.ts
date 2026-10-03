import type { ConversationMessage } from '../mistral';
import type { GameplayState } from '../gameplay/types';

export type Outcome = 'win' | 'lose_accusations' | 'lose_time' | 'lose_giveup' | 'lose_lawyer';
export interface Clue { id: string; text: string }
export interface GameSession {
  gameplay?: GameplayState;
  id: string;
  caseData: Record<string, unknown>;
  conversationHistory: ConversationMessage[];
  accusationsLeft: number;
  accusationsUsed: number;
  currentStress: number;
  winToken: string | null;
  createdAt: number;
  lastActivity: number;
  cluesCollected: number;
  clues: Clue[];
  startTime: number;
  endedAt: number | null;
  status: 'briefing' | 'active' | 'won' | 'lost';
  outcome: Outcome | null;
  questionsAsked: number;
  hintsUsed: number;
  hintTexts?: string[];
  learnedTactics: string[];
  totalPriorGames: number;
  highStressStreak: number;
  timerMode: 'countdown' | 'unlimited';
  acceptedAccusation: { text: string; explanation: string } | null;
  evaluation: Record<string, unknown> | null;
}
