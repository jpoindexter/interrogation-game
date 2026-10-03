import { budgetKey, transactBudget } from './repository';
import { AI_WORK_LIMITS, AiWorkError } from './ai-policy';

/** Reservations survive provider failures; replayed receipts must skip this call. */
export function reserveScopedAiWork(scope: { kind: 'session'; sessionId: string } | { kind: 'operator' }, characters: number): void {
  if (!Number.isSafeInteger(characters) || characters < 0 || characters > AI_WORK_LIMITS.perCallCharacters) {
    throw new AiWorkError('AI_INPUT_LIMIT', 'This AI request exceeds the local input allowance.', 413);
  }
  let allowed: boolean;
  try {
    const key = scope.kind === 'session' ? `session:${scope.sessionId}` : 'operator:local';
    const hash = budgetKey('ai', key);
    allowed = transactBudget(hash, (ledger, now) => {
      const entry = ledger.entries[hash] ?? { kind: 'ai', calls: 0, inputCharacters: 0, lastUsed: now };
      if (entry.kind !== 'ai') throw new Error('Invalid AI budget');
      if (entry.calls >= AI_WORK_LIMITS.calls || characters > AI_WORK_LIMITS.inputCharacters - entry.inputCharacters) return false;
      entry.calls++;
      entry.inputCharacters += characters;
      entry.lastUsed = Math.max(entry.lastUsed, now);
      ledger.entries[hash] = entry;
      return true;
    });
  } catch { throw new AiWorkError('AI_BUDGET_UNAVAILABLE', 'Local AI budget storage is unavailable. Retry later.', 503); }
  if (!allowed) throw new AiWorkError('AI_WORK_LIMIT', 'This AI work scope has reached its local allowance.', 429);
}
