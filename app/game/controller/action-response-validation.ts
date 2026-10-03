import { parseGameplayProjection } from '../playbook/response-parser';
import type { AccusationResponse, HintResponse, TurnResponse } from './action-types';

const OUTCOMES = ['win', 'lose_accusations', 'lose_time', 'lose_giveup', 'lose_lawyer'] as const;
const INVALID = 'The server response was incomplete or invalid. Your draft is preserved; retry to recover the response.';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(INVALID);
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(INVALID);
  return value;
}
function number(value: unknown, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) throw new Error(INVALID);
  return value;
}
function integer(value: unknown, max: number): number {
  const parsed = number(value, max);
  if (!Number.isSafeInteger(parsed)) throw new Error(INVALID);
  return parsed;
}
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error(INVALID);
  return value;
}
function flag(value: unknown): boolean | undefined {
  return value === undefined ? undefined : boolean(value);
}
function clues(value: unknown): { id: string; text: string }[] {
  if (!Array.isArray(value)) throw new Error(INVALID);
  const parsed = value.map(raw => { const item = record(raw); return { id: text(item.id), text: text(item.text) }; });
  if (new Set(parsed.map(clue => clue.id)).size !== parsed.length) throw new Error(INVALID);
  return parsed;
}
function outcome(value: unknown) {
  if (value === undefined || value === null) return value;
  if (!OUTCOMES.includes(value as typeof OUTCOMES[number])) throw new Error(INVALID);
  return value as typeof OUTCOMES[number];
}
function projection(value: unknown) {
  if (value === undefined) return undefined;
  const parsed = parseGameplayProjection(value);
  integer(parsed.establishedCount, Number.MAX_SAFE_INTEGER);
  parsed.turns.forEach(turn => number(turn.timestamp));
  return parsed;
}
function lifecycle(data: Record<string, unknown>) {
  const result = outcome(data.outcome);
  if (data.status !== undefined) {
    const expected = result === 'win' ? 'won' : result ? 'lost' : 'active';
    if (data.status !== expected) throw new Error(INVALID);
  }
  return { outcome: result, startedAt: number(data.startedAt), gameplay: projection(data.gameplay) };
}

/** Allowlist and validate the entire response before any visible game mutation. */
export function parseTurnResponse(value: unknown): TurnResponse {
  const data = record(value);
  const common = lifecycle(data);
  const timeExpired = flag(data.timeExpired);
  const lawyered_up = flag(data.lawyered_up);
  if (timeExpired && lawyered_up) throw new Error(INVALID);
  if (timeExpired && common.outcome !== undefined && common.outcome !== 'lose_time') throw new Error(INVALID);
  if (lawyered_up && common.outcome !== undefined && common.outcome !== 'lose_lawyer') throw new Error(INVALID);
  if (data.caught !== undefined) boolean(data.caught);
  return { ...common, spoken_response: text(data.spoken_response), stress_level: integer(data.stress_level, 10),
    clues: clues(data.clues), timeExpired, lawyered_up };
}

export function parseAccusationResponse(value: unknown, previous?: number): AccusationResponse {
  const data = record(value);
  const common = lifecycle(data);
  const correct = boolean(data.correct);
  const accusationsLeft = integer(data.accusationsLeft, 3);
  if (previous !== undefined && accusationsLeft !== previous - 1) throw new Error(INVALID);
  const expectedOutcome = correct ? 'win' : accusationsLeft === 0 ? 'lose_accusations' : null;
  if (common.outcome !== undefined && common.outcome !== expectedOutcome) throw new Error(INVALID);
  if (data.clues !== undefined) clues(data.clues);
  return { ...common, correct, accusationsLeft, confession: text(data.confession),
    ...(data.winToken === undefined ? {} : { winToken: text(data.winToken) }) };
}

export function parseHintResponse(value: unknown, previous?: number): HintResponse {
  const data = record(value);
  const maxHints = integer(data.maxHints, 5);
  const hintsUsed = integer(data.hintsUsed, maxHints);
  if (hintsUsed === 0 || (previous !== undefined && hintsUsed !== previous + 1)) throw new Error(INVALID);
  return { hint: text(data.hint), hintsUsed, maxHints };
}
