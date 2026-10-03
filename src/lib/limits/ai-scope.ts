import { AsyncLocalStorage } from 'node:async_hooks';
import type { StructuredTask } from '../ai/contracts';
import { reserveScopedAiWork } from './ai-budget';
import { AI_WORK_LIMITS, AiWorkError, assertAiWorkEnabled } from './ai-policy';
import { validateBudgetKey } from './validation';

const scopes = new AsyncLocalStorage<string>();
type WorkTask = Pick<StructuredTask, 'instructions' | 'input' | 'schema'>;
type AsyncReservation = (task: WorkTask, characters: number) => Promise<void>;
const reservations = new AsyncLocalStorage<AsyncReservation>();
export function withAsyncAiReservation<T>(reserve: AsyncReservation, action: () => T): T {
  return reservations.run(reserve, action);
}
export async function reserveAiWorkAsync(task: WorkTask) {
  const reserve = reservations.getStore();
  if (!reserve) return reserveAiWork(task);
  assertAiWorkEnabled();
  const reservedCharacters = taskCharacters(task);
  await reserve(task, reservedCharacters);
  return { scope: 'session' as const, reservedCharacters };
}
export function withAiWorkScope<T>(sessionId: string, action: () => T): T {
  validateBudgetKey(sessionId);
  return scopes.run(sessionId, action);
}
function taskCharacters(task: Pick<StructuredTask, 'instructions' | 'input' | 'schema'>): number {
  const characters = task.instructions.length + task.input.length + JSON.stringify(task.schema).length;
  if (!Number.isSafeInteger(characters) || characters > AI_WORK_LIMITS.perCallCharacters) {
    throw new AiWorkError('AI_INPUT_LIMIT', 'This AI request exceeds the local input allowance.', 413);
  }
  return characters;
}
/** Direct eval/CLI calls use a separate durable operator allowance. */
export function reserveAiWork(task: Pick<StructuredTask, 'instructions' | 'input' | 'schema'>) {
  if (reservations.getStore()) throw new AiWorkError('AI_BUDGET_UNAVAILABLE', 'Shared reservations must be awaited.', 503);
  assertAiWorkEnabled();
  const reservedCharacters = taskCharacters(task);
  const sessionId = scopes.getStore();
  if (!sessionId) {
    reserveScopedAiWork({ kind: 'operator' }, reservedCharacters);
    return { scope: 'operator' as const, reservedCharacters };
  }
  reserveScopedAiWork({ kind: 'session', sessionId }, reservedCharacters);
  return { scope: 'session' as const, reservedCharacters };
}
