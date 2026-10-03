import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { runCli, syntheticSecret } from './export-fixtures';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { NextRequest } from 'next/server';
import { GET } from '../app/api/export/route';
import { saveExport, type GameExport } from '../src/lib/session/exports/storage';
import { EXPORT_PAGE_BYTES } from '../src/lib/session/exports/page';

void test('local export downloads retain filtered ordering and expose bounded continuation without truncation', async context => {
  const directory = await mkdtemp(join(tmpdir(), 'export-page-local-'));
  const values = { INTERROGATION_DATA_DIR: directory, EXPORT_SECRET: syntheticSecret,
    SESSION_STORAGE: 'local', EXPORT_STORAGE: 'local', VERCEL: '' };
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  Object.assign(process.env, values);
  context.after(async () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await rm(directory, { recursive: true, force: true });
  });
  for (const number of [1, 2, 3, 4]) {
    const row: GameExport = { session_id: String(number).repeat(48), case_data: {},
      conversation: ['é'.repeat(number === 4 ? 600000 : 200000)], outcome: 'win', difficulty: 'easy',
      setting: number === 4 ? 'oversize' : 'startup', stats: {}, accusation_text: null,
      accusation_correct: true, created_at: '2026-10-03T12:00:00.000Z' };
    saveExport({ record: row, delivery: { state: 'saved', destination: 'local', attempts: 1 } });
  }
  const request = (query: string) => GET(new NextRequest(`http://localhost/api/export${query}`, {
    headers: { authorization: `Bearer ${values.EXPORT_SECRET}` },
  }));
  const first = await request('?setting=startup&limit=100');
  assert.equal(first.status, 200);
  const body = await first.text(); assert.ok(Buffer.byteLength(body) <= EXPORT_PAGE_BYTES);
  assert.equal(first.headers.get('x-export-count'), '2');
  const cursor = first.headers.get('x-export-next-cursor'); assert.ok(cursor);
  const second = await request(`?setting=startup&limit=100&cursor=${cursor}`);
  assert.equal(second.headers.get('x-export-next-cursor'), null);
  const rows = `${body}${await second.text()}`.trim().split('\n').map(line => JSON.parse(line));
  assert.deepEqual(rows.map(row => row.session_id[0]), ['3', '2', '1']);
  assert.ok(rows.every(row => row.conversation[0].length === 200000));
  assert.equal((await request(`?setting=startup&limit=100&offset=1&cursor=${cursor}`)).status, 400);
  const oversized = await request('?setting=oversize');
  assert.equal(oversized.status, 413); assert.equal((await oversized.json()).code, 'EXPORT_RECORD_TOO_LARGE');
  const server = createServer(async (incoming, outgoing) => {
    const headers = new Headers();
    for (const [key, value] of Object.entries(incoming.headers)) if (typeof value === 'string') headers.set(key, value);
    const response = await GET(new NextRequest(`http://localhost${incoming.url}`, { headers }));
    outgoing.writeHead(response.status, Object.fromEntries(response.headers)); outgoing.end(await response.text());
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  context.after(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); });
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const output = join(directory, 'full-batch.jsonl');
  const cli = await runCli(`http://127.0.0.1:${address.port}`, output, ['--setting=startup', '--limit=100']);
  assert.equal(cli.code, 0, cli.logs);
  const downloaded = (await readFile(output, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  assert.deepEqual(downloaded.map(row => row.session_id), rows.map(row => row.session_id));
  assert.equal(cli.logs.includes(values.EXPORT_SECRET), false);

});
