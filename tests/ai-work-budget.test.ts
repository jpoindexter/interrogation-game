import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AI_WORK_LIMITS, AiWorkError } from '../src/lib/limits/ai-policy';
import { withAiWorkScope, reserveAiWork } from '../src/lib/limits/ai-scope';
import { budgetDirectory } from './budget-fixtures';
import { aiBudgetWorkers } from './ai-work-budget-fixtures';
import { acquireFileLock, releaseFileLock } from '../src/lib/session/file-lock';

const task = { instructions: '', input: '', schema: {} };
const hasCode = (code: string) => (error: unknown) => error instanceof AiWorkError && error.code === code;

void test('actual simultaneous AI callers share a durable call allowance across restart', async () => {
  const fixture = budgetDirectory();
  try {
    const results = await aiBudgetWorkers({ directory: fixture.directory, scope: 'shared-ai-session', attempts: 20, workers: 8 });
    assert.equal(results.filter(value => value === 'allowed').length, 120);
    assert.equal(results.filter(value => value === 'AI_WORK_LIMIT').length, 40);
    assert.deepEqual(await aiBudgetWorkers({ directory: fixture.directory, scope: 'shared-ai-session', attempts: 1, workers: 1 }), ['AI_WORK_LIMIT']);
    assert.doesNotMatch(readFileSync(join(fixture.directory, 'limits/usage.json'), 'utf8'), /shared-ai-session/);
  } finally { fixture.cleanup(); }
});
void test('aggregate input budget is conservative and errors do not refund reservations', () => {
  const fixture = budgetDirectory();
  try {
    withAiWorkScope('characters', () => {
      const large = { ...task, input: 'x'.repeat(AI_WORK_LIMITS.perCallCharacters - 2) };
      for (let index = 0; index < 20; index++) reserveAiWork(large);
      assert.throws(() => reserveAiWork(task), hasCode('AI_WORK_LIMIT'));
    });
    assert.throws(() => withAiWorkScope('failed-provider', () => { reserveAiWork(task); throw new Error('Provider failed'); }));
    withAiWorkScope('failed-provider', () => {
      for (let index = 0; index < 119; index++) reserveAiWork(task);
      assert.throws(() => reserveAiWork(task), hasCode('AI_WORK_LIMIT'));
    });
  } finally { fixture.cleanup(); }
});
void test('overlapping async scopes stay isolated and direct operator calls get their own durable cap', async () => {
  const fixture = budgetDirectory();
  try {
    const run = (sessionId: string) => withAiWorkScope(sessionId, async () => {
      await Promise.resolve();
      for (let index = 0; index < 120; index++) assert.equal(reserveAiWork(task).scope, 'session');
      assert.throws(() => reserveAiWork(task), hasCode('AI_WORK_LIMIT'));
    });
    await Promise.all([run('scope-a'), run('scope-b')]);
    for (let index = 0; index < 120; index++) assert.equal(reserveAiWork(task).scope, 'operator');
    assert.throws(() => reserveAiWork(task), hasCode('AI_WORK_LIMIT'));
    assert.deepEqual(await aiBudgetWorkers({ directory: fixture.directory, scope: 'operator', attempts: 1, workers: 1 }), ['AI_WORK_LIMIT']);
  } finally { fixture.cleanup(); }
});
void test('operator stop and oversized inputs deny before reservation; restoring switch permits work', () => {
  const fixture = budgetDirectory();
  const previous = process.env.AI_WORK_ENABLED;
  try {
    process.env.AI_WORK_ENABLED = 'false';
    assert.throws(() => reserveAiWork(task), hasCode('AI_WORK_DISABLED'));
    assert.throws(() => withAiWorkScope('stopped', () => reserveAiWork(task)), hasCode('AI_WORK_DISABLED'));
    process.env.AI_WORK_ENABLED = 'true';
    assert.throws(() => reserveAiWork({ ...task, input: 'x'.repeat(AI_WORK_LIMITS.perCallCharacters) }), hasCode('AI_INPUT_LIMIT'));
    withAiWorkScope('stopped', () => {
      for (let index = 0; index < 120; index++) reserveAiWork(task);
      assert.throws(() => reserveAiWork(task), hasCode('AI_WORK_LIMIT'));
    });
  } finally {
    if (previous === undefined) delete process.env.AI_WORK_ENABLED; else process.env.AI_WORK_ENABLED = previous;
    fixture.cleanup();
  }
});
void test('lock errors are explicit pre-provider unavailable failures and hosted execution is unsupported', () => {
  const fixture = budgetDirectory();
  const previous = process.env.VERCEL;
  try {
    const path = join(fixture.directory, 'limits/usage.lock');
    const nonce = acquireFileLock(path)!;
    try {
      assert.throws(() => withAiWorkScope('locked', () => reserveAiWork(task)), error => {
        assert.ok(error instanceof AiWorkError); assert.equal(error.status, 503);
        assert.equal(error.code, 'AI_BUDGET_UNAVAILABLE');
        const serialized = JSON.parse(JSON.stringify(error));
        assert.equal(serialized.code, 'AI_BUDGET_UNAVAILABLE'); assert.equal(serialized.status, 503); return true;
      });
    } finally { releaseFileLock(path, nonce); }
    process.env.VERCEL = '1';
    assert.throws(() => reserveAiWork(task), hasCode('AI_BUDGET_UNAVAILABLE'));
  } finally {
    if (previous === undefined) delete process.env.VERCEL; else process.env.VERCEL = previous;
    fixture.cleanup();
  }
});
