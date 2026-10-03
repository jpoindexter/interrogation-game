import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function budgetDirectory() {
  const previous = process.env.INTERROGATION_DATA_DIR;
  const directory = mkdtempSync(join(tmpdir(), 'shared-budget-'));
  process.env.INTERROGATION_DATA_DIR = directory;
  return { directory, cleanup() {
    if (previous === undefined) delete process.env.INTERROGATION_DATA_DIR;
    else process.env.INTERROGATION_DATA_DIR = previous;
    rmSync(directory, { recursive: true, force: true });
  } };
}
export async function budgetWorkers(directory: string, mode: string, key: string, units: number, count: number) {
  const children = Array.from({ length: count }, () => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'tests/budget-worker.ts', mode, key, String(units)], {
      env: { ...process.env, INTERROGATION_DATA_DIR: directory }, stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = ''; let stderr = '';
    const ready = new Promise<void>((resolve, reject) => {
      child.once('error', reject);
      child.stdout.on('data', data => { stdout += String(data); if (stdout.includes('READY\n')) resolve(); });
    });
    child.stderr.on('data', data => { stderr += String(data); });
    const result = new Promise<string>((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', code => code === 0 ? resolve(stdout.replace('READY\n', '').trim()) : reject(new Error(stderr)));
    });
    return { child, ready, result };
  });
  await Promise.all(children.map(child => child.ready));
  for (const { child } of children) child.stdin.end('go');
  return Promise.all(children.map(child => child.result));
}
