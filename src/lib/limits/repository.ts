import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { acquireFileLock, releaseFileLock } from '../session/file-lock';
import { hasCode, writePrivateFile } from '../session/private-files';
import { sessionRepositoryKey } from '../session/repository';
import { BudgetUnavailableError, EXPIRY_MS, MAX_ENTRIES, type BudgetLedger } from './types';
import { parseLedger, validateBudgetKey } from './validation';

function readLedger(path: string): BudgetLedger {
  try {
    if (statSync(path).size > 3_000_000) throw new Error('Budget ledger is too large');
    return parseLedger(JSON.parse(readFileSync(path, 'utf8')));
  } catch (error) {
    if (hasCode(error, 'ENOENT')) return { version: 1, entries: {} };
    throw error;
  }
}
function pruneExpired(ledger: BudgetLedger, now: number): void {
  for (const [key, entry] of Object.entries(ledger.entries)) {
    if (now - entry.lastUsed > EXPIRY_MS[entry.kind]) delete ledger.entries[key];
  }
}
export function budgetKey(namespace: 'endpoint' | 'voice' | 'ai', key: string): string {
  validateBudgetKey(key);
  return createHash('sha256').update(`${namespace}:${key}`).digest('hex');
}
export function transactBudget<T>(key: string, mutate: (ledger: BudgetLedger, now: number) => T): T {
  try {
    const directory = join(dirname(sessionRepositoryKey()), 'limits');
    const lock = join(directory, 'usage.lock');
    const nonce = acquireFileLock(lock);
    if (!nonce) throw new BudgetUnavailableError();
    try {
      const path = join(directory, 'usage.json');
      const ledger = readLedger(path);
      const now = Date.now();
      pruneExpired(ledger, now);
      if (!Object.hasOwn(ledger.entries, key) && Object.keys(ledger.entries).length >= MAX_ENTRIES) {
        throw new BudgetUnavailableError();
      }
      const result = mutate(ledger, now);
      writePrivateFile(path, ledger);
      return result;
    } finally { releaseFileLock(lock, nonce); }
  } catch { throw new BudgetUnavailableError(); }
}
