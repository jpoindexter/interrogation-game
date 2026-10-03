import { randomUUID } from 'node:crypto';
import { linkSync, readFileSync, unlinkSync } from 'node:fs';
import { hasCode, writePrivateFile } from './private-files';

function ownerAlive(path: string): boolean {
  try {
    const owner: { pid: number } = JSON.parse(readFileSync(path, 'utf8'));
    if (!Number.isSafeInteger(owner.pid) || owner.pid <= 0) return true;
    try { process.kill(owner.pid, 0); return true; } catch (error) { return !hasCode(error, 'ESRCH'); }
  } catch { return true; }
}
export function acquireFileLock(path: string): string | null {
  const nonce = randomUUID();
  const candidate = `${path}.${nonce}.tmp`;
  writePrivateFile(candidate, { pid: process.pid, nonce });
  try {
    try { linkSync(candidate, path); return nonce; }
    catch (error) { if (!hasCode(error, 'EEXIST')) throw error; }
    const recovery = `${path}.recovery`;
    try { linkSync(candidate, recovery); }
    catch (error) { if (!hasCode(error, 'EEXIST')) throw error; return null; }
    try {
      if (ownerAlive(path)) return null;
      try { unlinkSync(path); } catch (error) { if (!hasCode(error, 'ENOENT')) throw error; }
      try { linkSync(candidate, path); return nonce; }
      catch (error) { if (!hasCode(error, 'EEXIST')) throw error; return null; }
    } finally { unlinkSync(recovery); }
  } finally { unlinkSync(candidate); }
}
export function releaseFileLock(path: string, nonce: string): void {
  try {
    const owner: { nonce: string } = JSON.parse(readFileSync(path, 'utf8'));
    if (owner.nonce === nonce) unlinkSync(path);
  } catch (error) { if (!hasCode(error, 'ENOENT')) throw error; }
}
