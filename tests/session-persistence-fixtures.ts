import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { TestContext } from 'node:test';
import { createSession, getSession } from '../src/lib/session/store';

export async function persistenceFixture(context: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), 'interrogation-session-'));
  const previous = process.env.INTERROGATION_DATA_DIR;
  process.env.INTERROGATION_DATA_DIR = directory;
  context.after(async () => {
    if (previous === undefined) delete process.env.INTERROGATION_DATA_DIR; else process.env.INTERROGATION_DATA_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  });
  const sessionId = createSession({ case_number: '234', setting: 'Test office', crime: 'A fictional theft',
    objective: 'Find the contradiction', briefing: 'A synthetic case.', suspect_name: 'Ada', suspect_gender: 'female',
    suspect_role: 'Technician', suspect_cover_story: 'I was elsewhere.', difficulty: 'medium',
    the_lie: 'Secret lie', the_truth: 'Secret truth', the_contradiction: 'Secret contradiction' });
  return { directory, sessionId, session: getSession(sessionId)! };
}
export function restartWorker(args: string[]) {
  return new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'tests/session-restart-worker.ts', ...args], {
      env: process.env, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), 10_000);
    child.stdout.on('data', chunk => { output += String(chunk); });
    child.stderr.on('data', chunk => { output += String(chunk); });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => { clearTimeout(timer); resolve({ code, output }); });
  });
}
