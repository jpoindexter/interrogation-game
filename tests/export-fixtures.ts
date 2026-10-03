import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { TestContext } from 'node:test';

export const syntheticSecret = 'synthetic-test-secret=never-log-this';

type Handler = (request: IncomingMessage, response: ServerResponse) => void;

export async function exportFixture(context: TestContext, handler: Handler) {
  const directory = await mkdtemp(join(tmpdir(), 'interrogation-export-'));
  const server = createServer(handler);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  context.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await rm(directory, { recursive: true, force: true });
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing local test server port.');
  return { directory, baseUrl: `http://127.0.0.1:${address.port}` };
}

export function runCli(baseUrl: string, output: string, extra: string[] = []) {
  return new Promise<{ code: number | null; logs: string }>((resolveResult, reject) => {
    const child = spawn(process.execPath, [
      '--import', 'tsx', resolve('scripts/export-data.ts'), `--output=${output}`, ...extra,
    ], {
      env: { ...process.env, EXPORT_BASE_URL: baseUrl, EXPORT_SECRET: syntheticSecret },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let logs = '';
    const timeout = setTimeout(() => child.kill('SIGKILL'), 10_000);
    child.stdout.on('data', chunk => { logs += chunk.toString(); });
    child.stderr.on('data', chunk => { logs += chunk.toString(); });
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('close', code => { clearTimeout(timeout); resolveResult({ code, logs }); });
  });
}
