import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { sessionRepositoryKey } from '../session/repository';
import { acquireFileLock, releaseFileLock } from '../session/file-lock';
import { hasCode, writePrivateFile } from '../session/private-files';
import { MAX_CACHE_BYTES, MAX_RECEIPT_BYTES, MAX_VOICE_RECEIPTS, type VoiceReceipt } from './receipt-types';

function validate(record: VoiceReceipt): VoiceReceipt {
  if (!record || record.version !== 1 || !['pending', 'complete'].includes(record.state)
    || !/^[a-f0-9]{64}$/.test(record.fingerprint) || !Number.isFinite(record.createdAt)
    || !Number.isSafeInteger(record.reservedBytes) || record.reservedBytes < 0 || record.reservedBytes > MAX_RECEIPT_BYTES) {
    throw new Error('Invalid voice receipt');
  }
  if (record.state === 'complete') validateResponse(record.response);
  return record;
}
function validateResponse(value: VoiceReceipt['response']) {
  if (!value || !Number.isInteger(value.status) || value.status < 200 || value.status > 599
    || !['audio/mpeg', 'application/json'].includes(value.contentType) || typeof value.body !== 'string') {
    throw new Error('Invalid cached voice response');
  }
}
function readReceipt(path: string): VoiceReceipt {
  if (statSync(path).size > MAX_RECEIPT_BYTES) throw new Error('Voice receipt exceeds size limit');
  return validate(JSON.parse(readFileSync(path, 'utf8')));
}
function allocatedBytes(directory: string, files: string[]): number {
  return files.reduce((total, name) => {
    const path = join(directory, name);
    const record = readReceipt(path);
    return total + (record.state === 'pending' ? record.reservedBytes : statSync(path).size);
  }, 0);
}
export function voiceDirectory(): string { return join(dirname(sessionRepositoryKey()), 'voice-requests'); }
export function voiceHash(value: string | Uint8Array): string { return createHash('sha256').update(value).digest('hex'); }

export class VoiceReceiptStore {
  private readonly path: string;
  private readonly lock: string;
  constructor(private readonly directory: string, key: string) {
    this.path = join(directory, `${voiceHash(key)}.json`);
    this.lock = `${this.path}.lock`;
  }
  acquire(): string | null { return acquireFileLock(this.lock); }
  release(owner: string): void { releaseFileLock(this.lock, owner); }
  load(): VoiceReceipt | null {
    try { return readReceipt(this.path); }
    catch (error) { if (hasCode(error, 'ENOENT')) return null; throw error; }
  }
  save(value: VoiceReceipt): void {
    validate(value);
    if (Buffer.byteLength(JSON.stringify(value)) > MAX_RECEIPT_BYTES) throw new Error('Voice receipt exceeds limit');
    writePrivateFile(this.path, value);
  }
  admit(value: VoiceReceipt): boolean {
    const lock = join(this.directory, 'admission.lock');
    const owner = acquireFileLock(lock);
    if (!owner) throw new Error('Voice receipt admission busy');
    try {
      const files = readdirSync(this.directory).filter(name => name.endsWith('.json'));
      if (files.length >= MAX_VOICE_RECEIPTS || allocatedBytes(this.directory, files) + value.reservedBytes > MAX_CACHE_BYTES) return false;
      this.save(value);
      return true;
    } finally { releaseFileLock(lock, owner); }
  }
}
