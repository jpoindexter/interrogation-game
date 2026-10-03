import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TestContext } from 'node:test';
import { createSession, getSession, deleteSession } from '../src/lib/session/store';
import { issueWinToken } from '../src/lib/session/tokens';
import { LocalLeaderboardStore } from '../src/lib/leaderboard/local-store';

export async function leaderboardFixture(context: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), 'interrogation-leaderboard-'));
  const previousDirectory = process.env.INTERROGATION_DATA_DIR;
  process.env.INTERROGATION_DATA_DIR = directory;
  const sessionId = createSession({ case_number: '321', suspect_name: 'Ada', setting: 'Tech company', difficulty: 'medium' });
  context.after(async () => {
    deleteSession(sessionId);
    if (previousDirectory === undefined) delete process.env.INTERROGATION_DATA_DIR; else process.env.INTERROGATION_DATA_DIR = previousDirectory;
    await rm(directory, { recursive: true, force: true });
  });
  const session = getSession(sessionId)!;
  session.outcome = 'win'; session.status = 'won'; session.questionsAsked = 5; session.accusationsUsed = 1;
  session.startTime = Date.now() - 123_000; session.endedAt = session.startTime + 123_000;
  session.cluesCollected = 3; session.currentStress = 7;
  const winToken = issueWinToken(sessionId)!;
  const storagePath = join(directory, 'records');
  return { directory, session, body: { sessionId, winToken, playerName: 'ABC' }, storagePath,
    store: new LocalLeaderboardStore(storagePath) };
}

export function redemptionWorker(directory: string, operation: 'fail' | 'redeem' | 'repeat') {
  return new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'tests/leaderboard-restart-worker.ts', operation], {
      env: { ...process.env, INTERROGATION_DATA_DIR: directory, AI_WORK_ENABLED: 'false' }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), 10_000);
    child.stdout.on('data', chunk => { output += String(chunk); });
    child.stderr.on('data', chunk => { output += String(chunk); });
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', code => { clearTimeout(timer); resolve({ code, output }); });
  });
}
