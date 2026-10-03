import { randomUUID } from 'node:crypto';
import { closeSync, fsyncSync, mkdirSync, openSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export function hasCode(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && error.code === code;
}
export function writePrivateFile(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    const file = openSync(temporary, 'wx', 0o600);
    try { writeFileSync(file, JSON.stringify(value)); fsyncSync(file); } finally { closeSync(file); }
    renameSync(temporary, path);
    const directory = openSync(dirname(path), 'r');
    try { fsyncSync(directory); } finally { closeSync(directory); }
  } finally {
    try { unlinkSync(temporary); } catch (error) { if (!hasCode(error, 'ENOENT')) throw error; }
  }
}
