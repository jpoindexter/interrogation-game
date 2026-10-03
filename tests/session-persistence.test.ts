import assert from 'node:assert/strict';
import test from 'node:test';
import type { SessionRecord } from '../src/lib/session/repository-types';
import { runSessionRequest } from '../src/lib/session/request-ledger';
import { getSession, persistSession } from '../src/lib/session/store';
import { getSessionRepository } from '../src/lib/session/repository';
import { issueWinToken } from '../src/lib/session/tokens';
import { persistenceFixture, restartWorker } from './session-persistence-fixtures';

void test('a committed request replays after a real process restart without another provider call', async context => {
  const fixture = await persistenceFixture(context);
  let calls = 0;
  const options = { sessionId: fixture.sessionId, requestId: 'same-request-1', fingerprint: { operation: 'test', question: 'Where?' },
    run: async () => { calls++; fixture.session.questionsAsked++; return { status: 200, body: { spoken_response: 'A stored answer' } }; } };
  const original = await runSessionRequest(options);
  assert.deepEqual(await runSessionRequest(options), original);
  assert.equal(calls, 1);
  const restarted = await restartWorker(['replay', fixture.sessionId, 'same-request-1']);
  assert.equal(restarted.code, 0, restarted.output);
  assert.deepEqual(JSON.parse(restarted.output), original);
  const inspected = await restartWorker(['inspect', fixture.sessionId]);
  assert.equal(JSON.parse(inspected.output).session.questionsAsked, 1);
});

void test('concurrent requests and changed-body reuse cannot call a provider twice', async context => {
  const fixture = await persistenceFixture(context);
  let release!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  let calls = 0;
  const options = { sessionId: fixture.sessionId, requestId: 'same-request-2', fingerprint: { operation: 'test', question: 'Where?' },
    run: async () => { calls++; await waiting; return { status: 200, body: { answer: 'done' } }; } };
  const first = runSessionRequest(options);
  assert.equal((await runSessionRequest(options)).body.code, 'ACTION_IN_PROGRESS');
  release(); await first;
  const changed = await runSessionRequest({ ...options, fingerprint: { operation: 'test', question: 'Different' } });
  assert.equal(changed.body.code, 'REQUEST_CONFLICT');
  assert.equal(calls, 1);
});

void test('a crashed provider attempt survives restart as interrupted and its stale lock is recovered', async context => {
  const fixture = await persistenceFixture(context);
  const crashed = await restartWorker(['crash', fixture.sessionId, 'crash-request-1']);
  assert.equal(crashed.code, 17);
  assert.equal(crashed.output, 'provider-started');
  let calls = 0;
  const response = await runSessionRequest({ sessionId: fixture.sessionId, requestId: 'crash-request-1',
    fingerprint: { operation: 'test', question: 'Where?' },
    run: async () => { calls++; return { status: 200, body: {} }; } });
  assert.equal(response.status, 409);
  assert.equal(response.body.code, 'REQUEST_INTERRUPTED');
  assert.equal(calls, 0);
});

void test('failed final persistence returns no success and cannot silently replay the provider', async context => {
  const fixture = await persistenceFixture(context);
  const repository = getSessionRepository();
  const save = repository.save.bind(repository);
  let writes = 0, calls = 0;
  const mocked = context.mock.method(repository, 'save', (record: SessionRecord) => { if (++writes === 2) throw new Error('Disk full'); save(record); });
  const options = { sessionId: fixture.sessionId, requestId: 'failed-save-1', fingerprint: { operation: 'test', question: 'Where?' },
    run: async () => { calls++; fixture.session.questionsAsked++; return { status: 200, body: { answer: 'not durable' } }; } };
  await assert.rejects(runSessionRequest(options), /Disk full/);
  mocked.mock.restore();
  assert.equal((await runSessionRequest(options)).body.code, 'REQUEST_INTERRUPTED');
  assert.equal(calls, 1);
  assert.equal(getSession(fixture.sessionId)?.questionsAsked, 0);
});

void test('a canonical win token grant survives a real process restart', async context => {
  const fixture = await persistenceFixture(context);
  fixture.session.outcome = 'win'; fixture.session.status = 'won'; fixture.session.endedAt = Date.now();
  const token = issueWinToken(fixture.sessionId)!;
  persistSession(fixture.sessionId);
  const restarted = await restartWorker(['inspect', fixture.sessionId, '', token]);
  assert.equal(restarted.code, 0, restarted.output);
  assert.equal(JSON.parse(restarted.output).tokenValid, true);
});
