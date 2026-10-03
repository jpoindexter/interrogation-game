import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { TestContext } from 'node:test';

export async function generationFixture(context: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), 'interrogation-generation-'));
  const previous = process.env.INTERROGATION_DATA_DIR;
  process.env.INTERROGATION_DATA_DIR = directory;
  context.after(async () => {
    if (previous === undefined) delete process.env.INTERROGATION_DATA_DIR; else process.env.INTERROGATION_DATA_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
}
export function generationWorker(operation: string, requestId: string) {
  const child = spawn(process.execPath, ['--import', 'tsx', 'tests/generation-restart-worker.ts', operation, requestId], {
    env: process.env, stdio: ['pipe', 'pipe', 'pipe'],
  });
  let output = '';
  const timer = setTimeout(() => child.kill('SIGKILL'), 10_000);
  const entered = new Promise<void>(resolve => {
    child.stdout.on('data', chunk => { output += String(chunk); if (output.includes('entered\n')) resolve(); });
  });
  child.stderr.on('data', chunk => { output += String(chunk); });
  const finished = new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    child.on('error', reject);
    child.on('close', code => { clearTimeout(timer); resolve({ code, output: output.replace('entered\n', '') }); });
  });
  return { child, entered, finished };
}
