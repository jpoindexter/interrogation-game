import { AI_WORK_LIMITS } from './ai-policy';
import { MAX_ENTRIES, VOICE_LIMITS, type BudgetEntry, type BudgetLedger } from './types';

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function count(value: unknown, maximum = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= maximum;
}
function endpointTokens(value: Record<string, unknown>): boolean {
  return count(value.capacity, 10_000) && value.capacity > 0
    && typeof value.tokens === 'number' && Number.isFinite(value.tokens)
    && value.tokens >= 0 && value.tokens <= value.capacity;
}
function validEntry(value: unknown): value is BudgetEntry {
  if (!record(value) || !count(value.lastUsed)) return false;
  if (value.kind === 'voice') {
    return count(value.speechCharacters, VOICE_LIMITS.speechCharacters) && count(value.recordings, VOICE_LIMITS.recordings);
  }
  if (value.kind === 'ai') return count(value.calls, AI_WORK_LIMITS.calls) && count(value.inputCharacters, AI_WORK_LIMITS.inputCharacters);
  return value.kind === 'endpoint' && endpointTokens(value);
}
export function parseLedger(value: unknown): BudgetLedger {
  if (!record(value) || value.version !== 1 || !record(value.entries)) throw new Error('Invalid budget ledger');
  const entries = Object.entries(value.entries);
  if (entries.length > MAX_ENTRIES) throw new Error('Budget ledger capacity exceeded');
  if (!entries.every(([key, entry]) => /^[a-f0-9]{64}$/.test(key) && validEntry(entry))) {
    throw new Error('Invalid budget entry');
  }
  return value as BudgetLedger;
}
export function validateBudgetKey(key: string): void {
  if (typeof key !== 'string' || key.length === 0 || key.length > 2048) throw new Error('Invalid budget key');
}
export function validateCapacity(capacity: number): void {
  if (!count(capacity, 10_000) || capacity === 0) throw new Error('Invalid budget capacity');
}
export function validateVoiceUnits(kind: string, units: number): void {
  if (!Object.hasOwn(VOICE_LIMITS, kind) || !count(units)) throw new Error('Invalid voice budget request');
}
