import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { generationFixture, generationWorker } from './generation-fixtures';
import { runGenerationRequest, type GenerationContext } from '../src/lib/session/generation-requests';
import { getSession } from '../src/lib/session/store';
import { AiError } from '../src/lib/ai/contracts';
import { NextRequest } from 'next/server';
import { GET as generationStatus } from '../app/api/generate-case/status/route';

const fingerprint = { difficulty: 'easy', setting: 'office' };

test('a timed-out case records its actual cause and replay never starts another generation', async context => {
  await generationFixture(context);
  let calls = 0;
  const request = { requestId: 'timed-out-generation', fingerprint,
    generate: async () => { calls++; throw new AiError('TIMEOUT', 'Private provider diagnostic'); } };
  const failed = await runGenerationRequest(request);
  assert.equal(failed.status, 504);
  assert.equal(failed.body.code, 'TIMEOUT');
  assert.doesNotMatch(JSON.stringify(failed.body), /Private provider diagnostic/);
  assert.deepEqual(await runGenerationRequest(request), failed);
  assert.equal(calls, 1);
});

test('completed generation survives a process restart without a second provider call or new session', async context => {
  const directory = await generationFixture(context);
  const first = await generationWorker('generate', 'restart-generation').finished;
  const second = await generationWorker('forbidden', 'restart-generation').finished;
  assert.equal(first.code, 0);
  assert.equal(second.code, 0);
  assert.deepEqual(JSON.parse(second.output), JSON.parse(first.output));
  const body = JSON.parse(first.output).body;
  assert.equal(getSession(body.sessionId)?.caseData.the_truth, 'Synthetic private truth');
  assert.ok(!first.output.includes('Synthetic private truth'));
  assert.equal(await readFile(join(directory, 'generation-calls'), 'utf8'), 'generate\n');
  assert.equal((await stat(join(directory, 'generation-requests'))).mode & 0o777, 0o700);
});

test('a concurrent process cannot invoke the same generation provider twice', async context => {
  const directory = await generationFixture(context);
  const first = generationWorker('hold', 'concurrent-generation');
  context.after(() => first.child.kill('SIGKILL'));
  await first.entered;
  const concurrent = await generationWorker('forbidden', 'concurrent-generation').finished;
  assert.equal(JSON.parse(concurrent.output).body.code, 'ACTION_IN_PROGRESS');
  first.child.stdin.end('finish');
  assert.equal(JSON.parse((await first.finished).output).status, 200);
  const replay = await generationWorker('forbidden', 'concurrent-generation').finished;
  assert.equal(JSON.parse(replay.output).status, 200);
  assert.equal(await readFile(join(directory, 'generation-calls'), 'utf8'), 'hold\n');
});

test('process death during provider work retains a pending receipt and never silently charges again', async context => {
  const directory = await generationFixture(context);
  const crash = await generationWorker('crash', 'crashed-generation').finished;
  assert.equal(crash.code, 17);
  const retry = await generationWorker('forbidden', 'crashed-generation').finished;
  assert.equal(JSON.parse(retry.output).body.code, 'REQUEST_INTERRUPTED');
  assert.equal(await readFile(join(directory, 'generation-calls'), 'utf8'), 'crash\n');
});

test('different inputs conflict while reordered identical inputs replay the completed case', async context => {
  await generationFixture(context);
  let calls = 0;
  const generate = async (generation: GenerationContext) => { calls++; return { sessionId: generation.sessionId }; };
  const original = await runGenerationRequest({ requestId: 'fingerprint-generation', fingerprint, generate });
  const repeated = await runGenerationRequest({ requestId: 'fingerprint-generation', fingerprint: { setting: 'office', difficulty: 'easy' }, generate });
  assert.deepEqual(repeated, original);
  const conflict = await runGenerationRequest({ requestId: 'fingerprint-generation', fingerprint: { ...fingerprint, difficulty: 'hard' }, generate });
  assert.equal(conflict.body.code, 'REQUEST_CONFLICT');
  assert.equal(calls, 1);
});

test('a dropped HTTP response replays the persisted generated case after server restart', async context => {
  const directory = await generationFixture(context);
  const server = createServer(async (_request, response) => {
    await generationWorker('generate', 'lost-http-generation').finished;
    response.destroy();
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  await assert.rejects(fetch(`http://127.0.0.1:${address.port}`));
  await new Promise<void>(resolve => server.close(() => resolve()));
  const restarted = createServer(async (_request, response) => {
    const retry = await generationWorker('forbidden', 'lost-http-generation').finished;
    const receipt = JSON.parse(retry.output);
    response.writeHead(receipt.status, { 'content-type': 'application/json' });
    response.end(JSON.stringify(receipt.body));
  });
  context.after(() => { restarted.closeAllConnections(); restarted.close(); });
  await new Promise<void>(resolve => restarted.listen(0, '127.0.0.1', resolve));
  const resumedAddress = restarted.address();
  assert.ok(resumedAddress && typeof resumedAddress !== 'string');
  const retry = await fetch(`http://127.0.0.1:${resumedAddress.port}`);
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).case_number, '321');
  assert.equal(await readFile(join(directory, 'generation-calls'), 'utf8'), 'generate\n');
});


for (const boundary of ['checkpoint-crash', 'session-crash']) {
  test(`generation recovers the reserved case after ${boundary} without another provider call`, async context => {
    const directory = await generationFixture(context);
    const crashed = await generationWorker(boundary, `boundary-${boundary}`).finished;
    assert.equal(crashed.code, boundary === 'checkpoint-crash' ? 18 : 19);
    const reservedId = JSON.parse(crashed.output).sessionId;
    assert.match(reservedId, /^[a-f0-9]{48}$/);
    const before = getSession(reservedId);
    assert.equal(Boolean(before), boundary === 'session-crash');
    const replay = await generationWorker('forbidden', `boundary-${boundary}`).finished;
    assert.equal(replay.code, 0);
    assert.equal(JSON.parse(replay.output).body.sessionId, reservedId);
    const restored = getSession(reservedId)!;
    assert.equal(restored.caseData.the_truth, 'Synthetic private truth');
    if (before) assert.equal(restored.createdAt, before.createdAt);
    const files = await import('node:fs/promises').then(fs => fs.readdir(join(directory, 'sessions')));
    assert.deepEqual(files.filter(file => file.endsWith('.json')), [`${reservedId}.json`]);
    assert.equal(await readFile(join(directory, 'generation-calls'), 'utf8'), `${boundary}\n`);
    assert.ok(!replay.output.includes('Synthetic private truth'));
  });
}


test('generation progress exposes only durable phases while private checkpoints remain hidden', async context => {
  await generationFixture(context);
  const requestId = 'progress-only-generation';
  const readStatus = async () => {
    const response = await generationStatus(new NextRequest(`http://localhost/api/generate-case/status?requestId=${requestId}`));
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    const body = await response.json();
    assert.deepEqual(Object.keys(body).sort(), ['phase', 'startedAt', 'state']);
    assert.ok(!JSON.stringify(body).includes('private truth'));
    return { status: response.status, body };
  };
  assert.equal((await readStatus()).status, 404);
  await runGenerationRequest({ requestId, fingerprint, generate: async generation => {
    assert.equal((await readStatus()).body.phase, 'preparing');
    generation.reportProgress('generating');
    assert.equal((await readStatus()).body.phase, 'generating');
    generation.saveCheckpoint({ data: { the_truth: 'private truth' } });
    generation.reportProgress('reviewing');
    const reviewing = await readStatus();
    assert.equal(reviewing.body.phase, 'reviewing');
    assert.equal(reviewing.body.state, 'pending');
    return { sessionId: generation.sessionId };
  } });
  const completed = await readStatus();
  assert.equal(completed.body.phase, 'ready');
  assert.equal(completed.body.state, 'complete');
});
