import assert from 'node:assert/strict';
import test from 'node:test';
import { readRetentionOptions } from '../scripts/retention/options';
import { retainHostedPayloads } from '../src/lib/storage/hosted/retention';

const env = { SUPABASE_URL: 'https://retention-fixture.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-only' };
const counts = { sessions: 1, requests: 2, generations: 1, voices: 1, exports: 0,
  exportsDeferred: 1, sessionsDeferred: 1, voicesDeferred: 1 };

test('retention defaults to preview and requires an exact configured target before apply', () => {
  assert.deepEqual(readRetentionOptions([], env), { apply: false, limit: 25, project: 'retention-fixture.supabase.co' });
  for (const args of [['--apply'], ['--apply', '--confirm-project=wrong.supabase.co'], ['--limit=101'],
    ['--limit=0'], ['--limit=1', '--limit=2'], ['--confirm-project=retention-fixture.supabase.co']]) {
    assert.throws(() => readRetentionOptions(args, env));
  }
  assert.equal(readRetentionOptions(['--apply', '--confirm-project=retention-fixture.supabase.co'], env).apply, true);
});

test('retention performs one call, returns counts only and rejects malformed or uncertain responses', async () => {
  let calls = 0;
  const result = await retainHostedPayloads({ apply: false, limit: 2 }, async (name, parameters) => {
    calls++;
    assert.equal(name, 'interrogation_retention_batch');
    assert.deepEqual(parameters, { p_apply: false, p_limit: 2 });
    return { kind: 'preview', ...counts, privateTranscript: 'must not escape' };
  });
  assert.deepEqual(result, { kind: 'preview', ...counts }); assert.equal(calls, 1);
  await assert.rejects(retainHostedPayloads({ apply: true, limit: 2 }, async () => ({ kind: 'preview', ...counts })));
  await assert.rejects(retainHostedPayloads({ apply: false, limit: 2 }, async () => ({ kind: 'preview', ...counts, voices: -1 })));
  await assert.rejects(retainHostedPayloads({ apply: true, limit: 2 }, async () => { calls++; throw new Error('unknown commit'); }));
  assert.equal(calls, 2, 'uncertain apply is never automatically retried');
});
