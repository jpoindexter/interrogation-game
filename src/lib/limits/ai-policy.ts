import { AiError } from '../ai/contracts';

/** Conservative reserved work, not tokens, billing, or observed model usage. */
export const AI_WORK_LIMITS = { calls: 120, inputCharacters: 2_000_000, perCallCharacters: 100_000 } as const;
export type AiWorkCode = 'AI_WORK_DISABLED' | 'AI_WORK_LIMIT' | 'AI_INPUT_LIMIT' | 'AI_BUDGET_UNAVAILABLE';
export class AiWorkError extends AiError {
  constructor(code: AiWorkCode, message: string, readonly status: number) { super(code, message); }
}
export function assertAiWorkEnabled(): void {
  if (process.env.AI_WORK_ENABLED === 'false') {
    throw new AiWorkError('AI_WORK_DISABLED', 'AI work has been stopped by the local operator.', 503);
  }
}
