import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync, renameSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { GET as exportGet } from '../app/api/export/route';
import { exportSession } from '../src/lib/session/export';
import { readExport, readLocalExports } from '../src/lib/session/exports/storage';
import { finishSession } from '../src/lib/session/transitions';
import { persistenceFixture } from './session-persistence-fixtures';
import { runCli, syntheticSecret } from './export-fixtures';

void test('completion exports persist once and the real admin route rejects invalid pagination', async context => {
  const fixture = await persistenceFixture(context);
  const previous = process.env.EXPORT_SECRET;
  process.env.EXPORT_SECRET = syntheticSecret;
  context.after(() => { if (previous === undefined) delete process.env.EXPORT_SECRET; else process.env.EXPORT_SECRET = previous; });
  finishSession(fixture.session, 'lose_giveup');
  assert.deepEqual(await exportSession(fixture.sessionId, 'lose_giveup'), { state: 'saved', destination: 'local', attempts: 1 });
  assert.equal((await exportSession(fixture.sessionId, 'lose_giveup')).attempts, 1);
  assert.equal(readLocalExports().length, 1);
  const response = await exportGet(new NextRequest('http://localhost/api/export?limit=-1', {
    headers: { Authorization: `Bearer ${syntheticSecret}` },
  }));
  assert.equal(response.status, 400);
  assert.equal((await exportGet(new NextRequest('http://localhost/api/export'))).status, 401);
});

void test('actual export CLI retrieves persisted local completion through the actual HTTP route', async context => {
  const fixture = await persistenceFixture(context);
  const previous = process.env.EXPORT_SECRET;
  process.env.EXPORT_SECRET = syntheticSecret;
  context.after(() => { if (previous === undefined) delete process.env.EXPORT_SECRET; else process.env.EXPORT_SECRET = previous; });
  finishSession(fixture.session, 'lose_giveup');
  await exportSession(fixture.sessionId, 'lose_giveup');
  const server = createServer(async (request, response) => {
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) if (typeof value === 'string') headers.set(key, value);
    const result = await exportGet(new NextRequest(`http://localhost${request.url}`, { headers }));
    response.writeHead(result.status, Object.fromEntries(result.headers));
    response.end(await result.text());
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  context.after(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const output = join(fixture.directory, 'download.jsonl');
  const cli = await runCli(`http://127.0.0.1:${address.port}`, output);
  assert.equal(cli.code, 0, cli.logs);
  assert.equal(cli.logs.includes(syntheticSecret), false);
  const record = JSON.parse((await readFile(output, 'utf8')).trim());
  assert.equal(record.session_id, fixture.sessionId);
  assert.equal(record.outcome, 'lose_giveup');
  assert.equal(record.case_data.the_truth, 'Secret truth');
});

void test('remote export failure leaves a durable outbox and confirmed retry stops resending', async context => {
  const fixture = await persistenceFixture(context);
  const keys = ['EXPORT_STORAGE', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
  const previous = keys.map(key => process.env[key]);
  context.after(() => keys.forEach((key, index) => {
    if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index];
  }));
  process.env.EXPORT_STORAGE = 'supabase';
  process.env.SUPABASE_URL = 'https://export-test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'synthetic-server-key';
  let requests = 0;
  context.mock.method(globalThis, 'fetch', async () => {
    requests++;
    return requests === 1 ? Response.json({ message: 'Unavailable' }, { status: 503 }) : new Response('', { status: 201 });
  });
  finishSession(fixture.session, 'lose_giveup');
  assert.equal((await exportSession(fixture.sessionId, 'lose_giveup')).state, 'pending');
  assert.equal(readLocalExports().length, 1);
  assert.equal((await exportSession(fixture.sessionId, 'lose_giveup')).state, 'saved');
  assert.equal((await exportSession(fixture.sessionId, 'lose_giveup')).state, 'saved');
  assert.equal(requests, 2);
});


void test('remote success with failed durable confirmation stays pending and retries the same export', async context => {
  const fixture = await persistenceFixture(context);
  const keys = ['EXPORT_STORAGE', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
  const previous = keys.map(key => process.env[key]);
  context.after(() => keys.forEach((key, index) => {
    if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index];
  }));
  process.env.EXPORT_STORAGE = 'supabase';
  process.env.SUPABASE_URL = 'https://confirmation-test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'synthetic-server-key';
  const destination = join(fixture.directory, 'exports', `${fixture.sessionId}.json`);
  const backup = `${destination}.pending-backup`;
  let requests = 0;
  const savedIds = new Set<string>();
  context.mock.method(globalThis, 'fetch', async (_input: unknown, options: RequestInit) => {
    requests++;
    savedIds.add(JSON.parse(String(options.body)).session_id);
    if (requests === 1) { renameSync(destination, backup); mkdirSync(destination); }
    return new Response('', { status: 201 });
  });
  finishSession(fixture.session, 'lose_giveup');
  try {
    assert.equal((await exportSession(fixture.sessionId, 'lose_giveup')).state, 'pending');
    assert.equal(JSON.parse(await readFile(backup, 'utf8')).delivery.state, 'pending');
  } finally { rmdirSync(destination); renameSync(backup, destination); }
  assert.equal(readExport(fixture.sessionId)!.delivery.state, 'pending');
  assert.equal((await exportSession(fixture.sessionId, 'lose_giveup')).state, 'saved');
  assert.equal(readExport(fixture.sessionId)!.delivery.state, 'saved');
  assert.equal((await exportSession(fixture.sessionId, 'lose_giveup')).state, 'saved');
  assert.equal(requests, 2);
  assert.equal(savedIds.size, 1);
});
