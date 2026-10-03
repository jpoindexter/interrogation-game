import type { PublicClue } from '@/lib/clue-contract';
import type { RuntimeOptions, GameRuntime } from './useGameRuntime';
import type { PublicGameplayProjection } from '../playbook/types';

export interface GameActionsContext extends RuntimeOptions {
  runtime: GameRuntime;
  request: <T>(path: string, body: Record<string, unknown>, parse: (value: unknown) => T) => Promise<T>;
}
interface ResponseProjection {
  gameplay?: PublicGameplayProjection;
  outcome?: 'win' | 'lose_accusations' | 'lose_time' | 'lose_giveup' | 'lose_lawyer' | null;
  startedAt: number;
}
export interface TurnResponse extends ResponseProjection {
  spoken_response: string;
  stress_level: number;
  clues: PublicClue[];
  lawyered_up?: boolean;
  timeExpired?: boolean;
}
export interface AccusationResponse extends ResponseProjection {
  correct: boolean;
  confession: string;
  accusationsLeft: number;
  winToken?: string;
}
export interface HintResponse { hint: string; hintsUsed: number; maxHints: number }
