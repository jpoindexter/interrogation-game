import { spawn } from 'node:child_process';

export async function aiBudgetWorkers(options: { directory: string; scope: string; attempts: number; workers: number }) {
  const children = Array.from({ length: options.workers }, () => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'tests/ai-work-budget-worker.ts', options.scope, String(options.attempts)], {
      env: { ...process.env, INTERROGATION_DATA_DIR: options.directory }, stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = ''; let stderr = '';
    const ready = new Promise<void>((resolve, reject) => {
      child.once('error', reject);
      child.stdout.on('data', data => { stdout += String(data); if (stdout.includes('READY\n')) resolve(); });
    });
    child.stderr.on('data', data => { stderr += String(data); });
    const result = new Promise<string[]>((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', code => code === 0 ? resolve(JSON.parse(stdout.replace('READY\n', ''))) : reject(new Error(stderr)));
    });
    return { child, ready, result };
  });
  await Promise.all(children.map(child => child.ready));
  for (const { child } of children) child.stdin.end('go');
  return (await Promise.all(children.map(child => child.result))).flat();
}
