import { readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { acquireFileLock, releaseFileLock } from './file-lock';
import { hasCode, writePrivateFile } from './private-files';
import type { SessionRecord, SessionRepository } from './repository-types';

export class LocalSessionRepository implements SessionRepository {
  private readonly owners = new Map<string, string>();
  constructor(private readonly directory: string) {}
  private path(id: string, suffix: 'json' | 'lock'): string {
    if (!/^[a-f0-9]{48}$/.test(id)) throw new Error('Invalid session ID');
    return join(this.directory, 'sessions', `${id}.${suffix}`);
  }
  load(id: string): SessionRecord | null {
    try {
      const record: SessionRecord = JSON.parse(readFileSync(this.path(id, 'json'), 'utf8'));
      if (record.version !== 1 || record.session?.id !== id || !record.requests) throw new Error('Unsupported or corrupt session snapshot');
      return record;
    } catch (error) { if (hasCode(error, 'ENOENT')) return null; throw error; }
  }
  save(record: SessionRecord): void { writePrivateFile(this.path(record.session.id, 'json'), record); }
  remove(id: string): void {
    try { unlinkSync(this.path(id, 'json')); } catch (error) { if (!hasCode(error, 'ENOENT')) throw error; }
  }
  acquire(id: string): boolean {
    if (this.owners.has(id)) return false;
    const owner = acquireFileLock(this.path(id, 'lock'));
    if (!owner) return false;
    this.owners.set(id, owner);
    return true;
  }
  release(id: string): void {
    const owner = this.owners.get(id);
    if (!owner) return;
    try { releaseFileLock(this.path(id, 'lock'), owner); } finally { this.owners.delete(id); }
  }
}
