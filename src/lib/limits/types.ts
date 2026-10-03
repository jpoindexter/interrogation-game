export type EndpointUsage = { kind: 'endpoint'; tokens: number; capacity: number; lastUsed: number };
export type VoiceUsage = { kind: 'voice'; speechCharacters: number; recordings: number; lastUsed: number };
export type AiUsage = { kind: 'ai'; calls: number; inputCharacters: number; lastUsed: number };
export type BudgetEntry = EndpointUsage | VoiceUsage | AiUsage;
export type BudgetLedger = { version: 1; entries: Record<string, BudgetEntry> };
export const MAX_ENTRIES = 10_000;
export const EXPIRY_MS = { endpoint: 5 * 60_000, voice: 2 * 60 * 60_000, ai: 2 * 60 * 60_000 };
export const VOICE_LIMITS = { speechCharacters: 60_000, recordings: 100 };
export class BudgetUnavailableError extends Error {
  constructor() { super('Local budget storage is unavailable. Retry after storage is restored.'); }
}
