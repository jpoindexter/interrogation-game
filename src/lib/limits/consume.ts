import { budgetKey, transactBudget } from './repository';
import { VOICE_LIMITS, type BudgetLedger, type EndpointUsage } from './types';
import { validateCapacity, validateVoiceUnits } from './validation';

function endpointEntry(ledger: BudgetLedger, key: string, capacity: number, now: number): EndpointUsage {
  const existing = ledger.entries[key];
  if (!existing) return { kind: 'endpoint', capacity, tokens: capacity, lastUsed: now };
  if (existing.kind !== 'endpoint' || existing.capacity !== capacity) throw new Error('Budget policy changed');
  return existing;
}
export function consumeEndpoint(key: string, capacity: number): boolean {
  validateCapacity(capacity);
  const hash = budgetKey('endpoint', key);
  return transactBudget(hash, (ledger, now) => {
    const entry = endpointEntry(ledger, hash, capacity, now);
    const elapsed = Math.max(0, now - entry.lastUsed);
    entry.tokens = Math.min(capacity, entry.tokens + (elapsed / 60_000) * capacity);
    entry.lastUsed = Math.max(now, entry.lastUsed);
    const allowed = entry.tokens >= 1;
    if (allowed) entry.tokens -= 1;
    ledger.entries[hash] = entry;
    return allowed;
  });
}
export function consumeVoice(key: string, kind: keyof typeof VOICE_LIMITS, units: number): boolean {
  validateVoiceUnits(kind, units);
  const hash = budgetKey('voice', key);
  return transactBudget(hash, (ledger, now) => {
    const entry = ledger.entries[hash] ?? { kind: 'voice', speechCharacters: 0, recordings: 0, lastUsed: now };
    if (entry.kind !== 'voice') throw new Error('Invalid budget kind');
    if (units > VOICE_LIMITS[kind] - entry[kind]) return false;
    entry[kind] += units;
    entry.lastUsed = Math.max(now, entry.lastUsed);
    ledger.entries[hash] = entry;
    return true;
  });
}
