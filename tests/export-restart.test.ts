import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ExportEnvelope, GameExport } from '../src/lib/session/exports/storage';

interface WorkerResult { id: string; pid: number; calls: number; delivery: ExportEnvelope['delivery']; error?: string }
function worker(directory: string, operation: 'outage' | 'resume' | 'local', base: string, id = '') {
  const child = spawn(process.execPath, ['--import', 'tsx', 'tests/export-restart-worker.ts', operation, id], {
    env: { ...process.env, INTERROGATION_DATA_DIR: directory, SESSION_STORAGE: 'local', VERCEL: '',
      EXPORT_STORAGE: operation === 'local' ? '' : 'supabase', EXPORT_FIXTURE_URL: base,
      SUPABASE_URL: operation === 'local' ? '' : 'https://export-restart-fixture.supabase.co',
      NEXT_PUBLIC_SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: operation === 'local' ? '' : 'synthetic-export-key' },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  let logs = '';
  child.stdout?.on('data', chunk => { logs += String(chunk); });
  child.stderr?.on('data', chunk => { logs += String(chunk); });
  const timeout = setTimeout(() => child.kill('SIGKILL'), 10_000);
  const closed = new Promise<{ code: number | null; signal: string | null; logs: string }>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => { clearTimeout(timeout); resolve({ code, signal, logs }); });
  });
  const result = new Promise<WorkerResult>((resolve, reject) => {
    child.once('message', (message: WorkerResult) => message.error ? reject(new Error(message.error)) : resolve(message));
    child.once('error', reject);
    child.once('exit', () => reject(new Error('Worker exited before receipt')));
  });
  return { child, result, closed };
}
async function envelope(directory: string, id: string): Promise<ExportEnvelope> {
  return JSON.parse(await readFile(join(directory, 'exports', `${id}.json`), 'utf8'));
}

test('remote outage pending export survives SIGKILL, resumes once in a fresh process, and no-DB demo remains local-only', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'export-restart-'));
  const children: ChildProcess[] = [];
  const records = new Map<string, GameExport>();
  const attempts: GameExport[] = [];
  let available = false;
  const server = createServer(async (request, response) => {
    try {
      const target = new URL(request.url!, 'http://fixture');
      assert.equal(target.pathname, '/rest/v1/game_exports');
      assert.equal(target.searchParams.get('on_conflict'), 'session_id');
      assert.equal(request.method, 'POST');
      assert.match(String(request.headers.prefer), /resolution=merge-duplicates/);
      assert.equal(request.headers.apikey, 'synthetic-export-key');
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const record = JSON.parse(Buffer.concat(chunks).toString()) as GameExport;
      attempts.push(record);
      if (!available) { response.writeHead(503, { 'content-type': 'application/json' }).end(JSON.stringify({ message: 'Synthetic outage' })); return; }
      records.set(record.session_id, record);
      response.writeHead(201).end();
    } catch { response.writeHead(500).end('Fixture contract failed'); }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    children.forEach(child => { if (child.exitCode === null && !child.killed) child.kill('SIGKILL'); });
    server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const first = worker(join(directory, 'remote'), 'outage', base); children.push(first.child);
  const pending = await first.result;
  assert.deepEqual(pending.delivery, { state: 'pending', destination: 'supabase', attempts: 1 });
  assert.equal(pending.calls, 1); assert.equal(records.size, 0);
  const original = await envelope(join(directory, 'remote'), pending.id);
  assert.equal(original.delivery.state, 'pending');
  assert.equal(original.record.conversation.length, 3); assert.equal(original.record.outcome, 'lose_giveup');
  assert.equal(original.record.case_data.the_truth, 'Returned at seven');
  assert.equal(original.record.difficulty, 'easy'); assert.ok(Number.isFinite(Date.parse(original.record.created_at)));
  assert.equal((await stat(join(directory, 'remote', 'exports', `${pending.id}.json`))).mode & 0o777, 0o600);
  first.child.kill('SIGKILL');
  const stopped = await first.closed;
  assert.equal(stopped.signal, 'SIGKILL');
  assert.deepEqual(await envelope(join(directory, 'remote'), pending.id), original);
  available = true;
  const second = worker(join(directory, 'remote'), 'resume', base, pending.id); children.push(second.child);
  const resumed = await second.result;
  assert.notEqual(resumed.pid, pending.pid);
  assert.deepEqual(resumed.delivery, { state: 'saved', destination: 'supabase', attempts: 2 });
  assert.equal(resumed.calls, 1, 'repeated evaluation does not resend confirmed export');
  const recoveredExit = await second.closed;
  assert.equal(recoveredExit.code, 0);
  assert.equal(attempts.length, 2); assert.equal(records.size, 1);
  assert.deepEqual(attempts[0], original.record); assert.deepEqual(attempts[1], original.record);
  assert.deepEqual(records.get(pending.id), original.record);
  assert.deepEqual((await envelope(join(directory, 'remote'), pending.id)).record, original.record);
  assert.equal((await readdir(join(directory, 'remote', 'exports'))).length, 1);
  const local = worker(join(directory, 'local'), 'local', base); children.push(local.child);
  const localResult = await local.result;
  assert.deepEqual(localResult.delivery, { state: 'saved', destination: 'local', attempts: 1 });
  const localExit = await local.closed;
  assert.equal(localResult.calls, 0); assert.equal(localExit.code, 0);
  assert.equal(attempts.length, 2, 'unconfigured database makes no placeholder network request');
  assert.doesNotMatch(stopped.logs + recoveredExit.logs + localExit.logs, /synthetic-export-key|Returned at seven|I left at six/);
});
