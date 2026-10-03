import assert from 'node:assert/strict';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { exportFixture, runCli, syntheticSecret } from './export-fixtures';

void test('CLI authenticates using Bearer and writes JSONL without logging credentials', async context => {
  let requestUrl = '';
  let authorization = '';
  const payload = '{"id":1}\n{"id":2}\n';
  const fixture = await exportFixture(context, (request, response) => {
    requestUrl = request.url ?? '';
    authorization = request.headers.authorization ?? '';
    response.setHeader('Content-Type', 'application/x-ndjson');
    response.end(payload);
  });
  const output = join(fixture.directory, 'nested', 'export=sample.jsonl');
  const result = await runCli(fixture.baseUrl, output, ['--limit=2', '--outcome=win', '--difficulty=hard']);
  assert.equal(result.code, 0, result.logs);
  assert.equal(authorization, `Bearer ${syntheticSecret}`);
  const url = new URL(requestUrl, fixture.baseUrl);
  assert.equal(url.pathname, '/api/export');
  assert.equal(url.searchParams.get('limit'), '2');
  assert.equal(url.searchParams.get('outcome'), 'win');
  assert.equal(url.searchParams.get('difficulty'), 'hard');
  assert.equal(url.searchParams.has('secret'), false);
  assert.equal(requestUrl.includes(syntheticSecret), false);
  assert.equal(result.logs.includes(syntheticSecret), false);
  assert.match(result.logs, /Written 2 records/);
  assert.equal(await readFile(output, 'utf8'), payload);
  if (process.platform !== 'win32') assert.equal((await stat(output)).mode & 0o777, 0o600);
});

for (const status of [401, 500]) {
  void test(`HTTP ${status} preserves existing output and does not echo response secrets`, async context => {
    const fixture = await exportFixture(context, (_request, response) => {
      response.writeHead(status);
      response.end(`Request failed with ${syntheticSecret}`);
    });
    const output = join(fixture.directory, 'export.jsonl');
    await writeFile(output, 'previous export');
    const result = await runCli(fixture.baseUrl, output);
    assert.equal(result.code, 1);
    assert.match(result.logs, new RegExp(`HTTP ${status}`));
    assert.equal(result.logs.includes(syntheticSecret), false);
    assert.equal(await readFile(output, 'utf8'), 'previous export');
    assert.deepEqual(await readdir(fixture.directory), ['export.jsonl']);
  });
}

void test('invalid JSONL preserves an existing export', async context => {
  const fixture = await exportFixture(context, (_request, response) => response.end('<html>Error</html>'));
  const output = join(fixture.directory, 'export.jsonl');
  await writeFile(output, 'previous export');
  const result = await runCli(fixture.baseUrl, output);
  assert.equal(result.code, 1);
  assert.match(result.logs, /not valid JSONL/);
  assert.equal(await readFile(output, 'utf8'), 'previous export');
});

void test('redirects are refused rather than forwarding an export credential', async context => {
  let redirectedRequests = 0;
  const fixture = await exportFixture(context, (request, response) => {
    if (request.url?.startsWith('/api/export')) {
      response.writeHead(302, { Location: '/credential-sink' });
    } else { redirectedRequests++; }
    response.end();
  });
  const result = await runCli(fixture.baseUrl, join(fixture.directory, 'export.jsonl'));
  assert.equal(result.code, 1);
  assert.equal(redirectedRequests, 0);
  assert.deepEqual(await readdir(fixture.directory), []);
  assert.equal(result.logs.includes(syntheticSecret), false);
});

void test('invalid limits fail before requesting an export', async context => {
  let requests = 0;
  const fixture = await exportFixture(context, (_request, response) => { requests++; response.end(); });
  const result = await runCli(fixture.baseUrl, join(fixture.directory, 'export.jsonl'), ['--limit=-1']);
  assert.equal(result.code, 1);
  assert.equal(requests, 0);
  assert.match(result.logs, /limit must be an integer/);
});

void test('an empty JSONL response writes a valid empty export', async context => {
  const fixture = await exportFixture(context, (_request, response) => response.end());
  const output = join(fixture.directory, 'export.jsonl');
  const result = await runCli(fixture.baseUrl, output);
  assert.equal(result.code, 0, result.logs);
  assert.equal(await readFile(output, 'utf8'), '');
  assert.match(result.logs, /Written 0 records/);
});
