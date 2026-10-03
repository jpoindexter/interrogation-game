import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { sessionRepositoryKey } from './repository';
import { acquireFileLock, releaseFileLock } from './file-lock';
import { hasCode, writePrivateFile } from './private-files';
import type { SessionResponse } from './request-ledger';

export const GENERATION_TTL = 24 * 60 * 60 * 1000;
export const GENERATION_LIMIT = 1000;
export type GenerationPhase = 'preparing' | 'generating' | 'reviewing' | 'ready';
export interface GenerationReceipt {
  version: 1;
  fingerprint: string;
  createdAt: number;
  state: 'pending' | 'complete';
  phase?: GenerationPhase;
  sessionId?: string;
  checkpoint?: Record<string, unknown>;
  response?: SessionResponse;
}
function validateReceipt(record: GenerationReceipt): void {
  if (record.version !== 1 || !['pending', 'complete'].includes(record.state)
    || typeof record.fingerprint !== 'string' || !Number.isFinite(record.createdAt)) throw new Error('Invalid generation receipt');
  if (record.phase !== undefined && !['preparing', 'generating', 'reviewing', 'ready'].includes(record.phase)) throw new Error('Invalid generation phase');
  validateCheckpoint(record);
  if (record.state === 'complete') validateResponse(record.response);
}
function validateCheckpoint(record: GenerationReceipt): void {
  if (record.sessionId !== undefined && !/^[a-f0-9]{48}$/.test(record.sessionId)) throw new Error('Invalid reserved session ID');
  if (record.checkpoint !== undefined && (!record.sessionId || !record.checkpoint
    || typeof record.checkpoint !== 'object' || Array.isArray(record.checkpoint))) throw new Error('Invalid generation checkpoint');
}
function validateResponse(response: SessionResponse | undefined): void {
  if (!response || !Number.isInteger(response.status) || !response.body
    || typeof response.body !== 'object' || Array.isArray(response.body)) throw new Error('Invalid generation response');
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
}
export function generationFingerprint(value: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}
export function generationDirectory(): string {
  return join(dirname(sessionRepositoryKey()), 'generation-requests');
}
export class GenerationStore {
  private readonly recordPath: string;
  private readonly lockPath: string;
  constructor(private readonly directory: string, requestId: string) {
    const key = createHash('sha256').update(requestId).digest('hex');
    this.recordPath = join(directory, `${key}.json`);
    this.lockPath = join(directory, `${key}.lock`);
  }
  acquire(): string | null { return acquireFileLock(this.lockPath); }
  release(owner: string): void { releaseFileLock(this.lockPath, owner); }
  load(): GenerationReceipt | null {
    try {
      const record: GenerationReceipt = JSON.parse(readFileSync(this.recordPath, 'utf8'));
      validateReceipt(record);
      return record;
    } catch (error) { if (hasCode(error, 'ENOENT')) return null; throw error; }
  }
  save(record: GenerationReceipt): void { writePrivateFile(this.recordPath, record); }
  admit(record: GenerationReceipt): 'accepted' | 'busy' | 'limit' {
    mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    const lock = join(this.directory, 'admission.lock');
    const owner = acquireFileLock(lock);
    if (!owner) return 'busy';
    try {
      if (readdirSync(this.directory).filter(name => name.endsWith('.json')).length >= GENERATION_LIMIT) return 'limit';
      this.save(record);
      return 'accepted';
    } finally { releaseFileLock(lock, owner); }
  }
}
