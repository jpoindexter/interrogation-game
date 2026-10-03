import assert from 'node:assert/strict';
import test from 'node:test';
import { readdir, stat, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { generationFixture } from './generation-fixtures';
import { runGenerationRequest, type GenerationContext } from '../src/lib/session/generation-requests';
import { GenerationStore, generationDirectory, generationFingerprint, GENERATION_LIMIT, GENERATION_TTL, type GenerationReceipt } from '../src/lib/session/generation-store';

const fingerprint = { difficulty: 'easy' };

test('final receipt write failure never reports success or replays provider work', async context => {
  const directory = await generationFixture(context);
  const save = GenerationStore.prototype.save;
  let writes = 0;
  context.mock.method(GenerationStore.prototype, 'save', function (this: GenerationStore, record: GenerationReceipt) {
    if (++writes === 2) throw new Error('Synthetic disk full');
    save.call(this, record);
  });
  let calls = 0;
  const request = { requestId: 'failed-receipt-generation', fingerprint,
    generate: async (generation: GenerationContext) => { calls++; return { sessionId: generation.sessionId }; } };
  assert.equal((await runGenerationRequest(request)).body.code, 'STORAGE_UNAVAILABLE');
  assert.equal((await runGenerationRequest(request)).body.code, 'REQUEST_INTERRUPTED');
  assert.equal(calls, 1);
  const entries = await readdir(join(directory, 'generation-requests'));
  for (const file of entries) assert.equal((await stat(join(directory, 'generation-requests', file))).mode & 0o777, 0o600);
});

test('expired receipts are tombstones and require an explicit new intent rather than charging again', async context => {
  await generationFixture(context);
  const store = new GenerationStore(generationDirectory(), 'expired-generation');
  store.save({ version: 1, fingerprint: generationFingerprint(fingerprint), state: 'complete',
    createdAt: Date.now() - GENERATION_TTL - 1, response: { status: 200, body: { sessionId: 'old-session' } } });
  let calls = 0;
  const response = await runGenerationRequest({ requestId: 'expired-generation', fingerprint,
    generate: async () => { calls++; return { sessionId: 'new-session' }; } });
  assert.equal(response.status, 410);
  assert.equal(response.body.code, 'GENERATION_EXPIRED');
  assert.equal(calls, 0);
});

test('receipt admission enforces the bounded store without evicting retry protection', async context => {
  await generationFixture(context);
  const directory = generationDirectory();
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await Promise.all(Array.from({ length: GENERATION_LIMIT }, (_, index) => writeFile(join(directory, `${index}.json`), '{}', { mode: 0o600 })));
  let calls = 0;
  const response = await runGenerationRequest({ requestId: 'over-limit-generation', fingerprint,
    generate: async () => { calls++; return { sessionId: 'new-session' }; } });
  assert.equal(response.status, 429);
  assert.equal(response.body.code, 'GENERATION_LIMIT');
  assert.equal(calls, 0);
  assert.equal((await readdir(directory)).length, GENERATION_LIMIT);
});

test('missing IDs, known failures and unsupported hosted storage never silently start another attempt', async context => {
  await generationFixture(context);
  let calls = 0;
  const generate = async () => { calls++; throw new Error('Provider failed'); };
  assert.equal((await runGenerationRequest({ requestId: undefined, fingerprint, generate })).status, 400);
  const request = { requestId: 'known-failed-generation', fingerprint, generate };
  assert.equal((await runGenerationRequest(request)).body.code, 'ACTION_FAILED');
  assert.equal((await runGenerationRequest(request)).body.code, 'ACTION_FAILED');
  assert.equal(calls, 1);
  const previous = process.env.VERCEL;
  process.env.VERCEL = '1';
  try { assert.equal((await runGenerationRequest({ ...request, requestId: 'hosted-generation' })).body.code, 'STORAGE_UNAVAILABLE'); }
  finally { if (previous === undefined) delete process.env.VERCEL; else process.env.VERCEL = previous; }
  assert.equal(calls, 1);
});

test('a completed case with a failed public receipt recovers from the private checkpoint without re-generation', async context => {
  await generationFixture(context);
  const { createSessionAt, getSession } = await import('../src/lib/session/store');
  const originalSave = GenerationStore.prototype.save;
  let saves = 0;
  context.mock.method(GenerationStore.prototype, 'save', function (this: GenerationStore, record: GenerationReceipt) {
    if (++saves === 3) throw new Error('Synthetic final receipt failure');
    originalSave.call(this, record);
  });
  let providerCalls = 0;
  let reserved = '';
  const request = { requestId: 'recoverable-write-failure', fingerprint,
    generate: async (generation: GenerationContext) => {
      reserved = generation.sessionId;
      let checkpoint = generation.checkpoint;
      if (!checkpoint) {
        providerCalls++;
        checkpoint = { data: { difficulty: 'easy', the_truth: 'Private checkpoint truth' } };
        generation.saveCheckpoint(checkpoint);
      }
      createSessionAt({ sessionId: generation.sessionId, caseData: checkpoint.data as Record<string, unknown> });
      return { sessionId: generation.sessionId, difficulty: 'easy' };
    } };
  assert.equal((await runGenerationRequest(request)).body.code, 'STORAGE_UNAVAILABLE');
  const createdAt = getSession(reserved)!.createdAt;
  const replay = await runGenerationRequest(request);
  assert.equal(replay.status, 200);
  assert.equal(replay.body.sessionId, reserved);
  assert.equal(getSession(reserved)!.createdAt, createdAt);
  assert.equal(providerCalls, 1);
  assert.ok(!JSON.stringify(replay).includes('Private checkpoint truth'));
});
