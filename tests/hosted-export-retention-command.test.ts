import assert from 'node:assert/strict';
import test from 'node:test';
import { readExportRetentionOptions } from '../scripts/retention/export-options';
import { retainHostedExports } from '../src/lib/storage/hosted/export-retention';

const env = { SUPABASE_URL: 'https://retention-fixture.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-only' };
const counts = { sessions: 2, exports: 2, scoreReceipts: 1, deferred: 1 };

test('export retention defaults to 30-day preview; age, bounds and exact project confirmation are required', () => {
  assert.deepEqual(readExportRetentionOptions([], env), {
    apply: false, limit: 25, days: 30, project: 'retention-fixture.supabase.co',
  });
  for (const argv of [['--days=0'], ['--days=3651'], ['--days=1.5'], ['--days=1', '--days=2'],
    ['--days='], ['--apply'], ['--apply', '--confirm-project=wrong.supabase.co']]) {
    assert.throws(() => readExportRetentionOptions(argv, env));
  }
  assert.equal(readExportRetentionOptions(['--days=90', '--apply', '--confirm-project=retention-fixture.supabase.co'], env).days, 90);
});

test('export retention sends one bounded request and exposes only validated aggregate counts', async () => {
  let calls = 0;
  assert.deepEqual(await retainHostedExports({ apply: false, limit: 3, days: 30 }, async (name, parameters) => {
    calls++;
    assert.equal(name, 'interrogation_export_retention_batch');
    assert.deepEqual(parameters, { p_apply: false, p_limit: 3, p_days: 30 });
    return { kind: 'preview', ...counts, privateTranscript: 'must not escape' };
  }), { kind: 'preview', ...counts });
  await assert.rejects(retainHostedExports({ apply: true, limit: 3, days: 30 }, async () => {
    calls++; throw new Error('Unknown commit');
  }));
  assert.equal(calls, 2, 'an uncertain commit is not automatically retried');
  await assert.rejects(retainHostedExports({ apply: false, limit: 1, days: 30 }, async () => ({ kind: 'preview', ...counts })));
  await assert.rejects(retainHostedExports({ apply: true, limit: 3, days: 30 }, async () => ({ kind: 'preview', ...counts })));
});
