import type { ConversationMessage } from '@/lib/ai/types';
import { parseGameplayProjection } from '../playbook/response-parser';
import { validateEvaluation } from '../result/validation';
import { parsePublicCase } from './case-loader';
import type { SessionSnapshot } from './session-recovery';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid recovered session. Please retry.');
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid recovered text. Please retry.');
  return value;
}
function integer(value: unknown, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > max) {
    throw new Error('Invalid recovered game state. Please retry.');
  }
  return value;
}
function list<T>(value: unknown, parse: (item: unknown) => T): T[] {
  if (!Array.isArray(value)) throw new Error('Incomplete recovered session. Please retry.');
  return value.map(parse);
}
function choice<T extends string>(value: unknown, choices: readonly T[]): T {
  if (!choices.includes(value as T)) throw new Error('Invalid recovered status. Please retry.');
  return value as T;
}
function message(value: unknown): ConversationMessage {
  const item = record(value);
  return { role: choice(item.role, ['user', 'assistant']), content: text(item.content),
    ...(item.timestamp === undefined ? {} : { timestamp: integer(item.timestamp) }),
    ...(item.kind === undefined ? {} : { kind: choice(item.kind, ['question', 'accusation', 'terminal'] as const) }),
    ...(item.accusationAttempt === undefined ? {} : { accusationAttempt: integer(item.accusationAttempt, 3) }) };
}
function clue(value: unknown) {
  const item = record(value);
  return { id: text(item.id), text: text(item.text) };
}
function pending(value: unknown) {
  const item = record(value);
  return { requestId: text(item.requestId), startedAt: integer(item.startedAt) };
}
function validLifecycle(status: string, outcome: string | null): boolean {
  if (outcome === 'win') return status === 'won';
  if (outcome) return status === 'lost';
  return status === 'briefing' || status === 'active';
}
function lifecycle(data: Record<string, unknown>) {
  const status = choice(data.status, ['briefing', 'active', 'won', 'lost']);
  const outcome = data.outcome === null ? null
    : choice(data.outcome, ['win', 'lose_time', 'lose_giveup', 'lose_lawyer', 'lose_accusations']);
  if (!validLifecycle(status, outcome)) {
    throw new Error('The recovered outcome conflicts with its status. Please retry.');
  }
  const result = outcome ? validateEvaluation(data.result, outcome === 'win' ? 'win' : 'lose') : undefined;
  if (result && result.outcome !== outcome) throw new Error('The recovered result belongs to a different outcome. Please retry.');
  return { status, outcome, result };
}
function validateTiming(caseData: ReturnType<typeof parsePublicCase>, timerMode: string, startedAt: number) {
  if (caseData.timerMode !== undefined && caseData.timerMode !== timerMode) throw new Error('The recovered timer conflicts with the case. Please retry.');
  if (caseData.startedAt !== undefined && caseData.startedAt !== startedAt) throw new Error('The recovered start time conflicts with the case. Please retry.');
  if (caseData.playMode && timerMode !== (caseData.playMode === 'challenge' ? 'countdown' : 'unlimited')) {
    throw new Error('The recovered timer conflicts with the play mode. Please retry.');
  }
}

/** Validate the whole recovery boundary before a controller mutates its state. */
export function parseSessionSnapshot(value: unknown, id: string): SessionSnapshot {
  const data = record(value);
  const caseData = parsePublicCase(data.caseData);
  if (caseData.sessionId !== id) throw new Error('The recovered session does not match this link. Please retry.');
  const timerMode = choice(data.timerMode, ['countdown', 'unlimited']);
  const startedAt = integer(data.startedAt);
  validateTiming(caseData, timerMode, startedAt);
  const state = lifecycle(data);
  if (state.status === 'active' && startedAt === 0) throw new Error('The recovered timer has no start. Please retry.');
  return { ...state, caseData: { ...caseData, timerMode, startedAt }, timerMode, startedAt,
    conversationHistory: list(data.conversationHistory, message), clues: list(data.clues, clue),
    accusationsLeft: integer(data.accusationsLeft, 3), hintsUsed: integer(data.hintsUsed),
    hintTexts: data.hintTexts === undefined ? [] : list(data.hintTexts, text),
    stressLevel: integer(data.stressLevel, 10), pendingRequests: list(data.pendingRequests, pending),
    ...(data.winToken === undefined || data.winToken === null ? {} : { winToken: text(data.winToken) }),
    ...(data.gameplay === undefined ? {} : { gameplay: parseGameplayProjection(data.gameplay) }) };
}
