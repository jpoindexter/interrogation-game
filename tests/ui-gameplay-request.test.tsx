import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GameplayRequestError, GameplayRequestSession, dialogueFailure } from '../app/game/playbook/request-session';
import { parseActionUpdate, parsePinUpdate } from '../app/game/playbook/response-parser';
import PracticeModeLink from '../app/cases/PracticeModeLink';

const statement = { id: 'pin-1', turnId: 'turn-1', quote: 'I left at six.' };
const gameplay = {
  caseId: 'case-1', title: 'Case', briefing: 'Briefing', status: 'active', establishedCount: 0,
  turns: [{ id: statement.turnId, question: 'When?', answer: statement.quote, timestamp: 1 }],
  statements: [statement], exhibits: [{ id: 'log', title: 'Log', kind: 'document', text: 'Public text' }],
};
const action = { id: 'action-1', kind: 'clarify' as const, statementId: statement.id, question: 'When exactly?' };
const result = {
  actionId: action.id, statementId: statement.id, turnId: 'turn-2', answer: 'Six.', status: 'dialogue_only',
  explanation: 'Detail requested.', progressAdded: false, establishedCount: 0,
};
const envelope = { result, gameplay: { ...gameplay, turns: [...gameplay.turns, { id: 'turn-2', question: action.question, answer: result.answer, timestamp: 2 }] }, response: 'Six.', clues: [{ id: 'clue-1', text: 'Recorded fact' }], stressLevel: 4, startedAt: 123 };

test('pin parser validates saved exact source and drops internal fields', () => {
  const parsed = parsePinUpdate({ statement: { ...statement, claimId: 'secret' }, gameplay: { ...gameplay, receipts: 'secret' } }, statement);
  assert.deepEqual(parsed.statement, statement);
  assert.equal('receipts' in parsed.gameplay, false);
  assert.throws(() => parsePinUpdate({ statement, gameplay }, { turnId: 'foreign', quote: statement.quote }), /source/);
  assert.throws(() => parsePinUpdate({ statement, gameplay: { ...gameplay, statements: [] } }, statement), /not saved/);
});

test('action parser rejects mismatched sources and malformed state before update', () => {
  assert.equal(parseActionUpdate(envelope, action).result.actionId, action.id);
  assert.throws(() => parseActionUpdate({ ...envelope, result: { ...result, actionId: 'other' } }, action), /submitted sources/);
  assert.throws(() => parseActionUpdate({ ...envelope, result: { ...result, exhibitId: 'hidden' } }, action), /submitted sources/);
  assert.throws(() => parseActionUpdate({ ...envelope, stressLevel: 'four' }, action), /number/);
  assert.throws(() => parseActionUpdate({ ...envelope, gameplay: { ...gameplay, status: 'fictional' } }, action), /status/);
  assert.throws(() => parseActionUpdate({ ...envelope, clues: [42] }, action), /response/);
});

test('evidence response integrity rejects forged progress, broken references and inconsistent dialogue', () => {
  const corrupt = [
    { response: 'A different answer' }, { stressLevel: 11 }, { stressLevel: -1 },
    { startedAt: -1 }, { clues: [envelope.clues[0], envelope.clues[0]] },
    { result: { ...result, progressAdded: true } }, { result: { ...result, establishedCount: 1 } },
    { result: { ...result, status: 'contradiction_established', progressAdded: true, establishedCount: 1 },
      gameplay: { ...envelope.gameplay, establishedCount: 1 } },
    { gameplay: { ...envelope.gameplay, establishedCount: -1 } },
    { gameplay: { ...envelope.gameplay, turns: gameplay.turns } },
    { gameplay: { ...envelope.gameplay, turns: [...envelope.gameplay.turns, gameplay.turns[0]] } },
    { gameplay: { ...envelope.gameplay, statements: [{ ...statement, turnId: 'foreign' }] } },
    { gameplay: { ...envelope.gameplay, statements: [{ ...statement, quote: 'invented quotation' }] } },
    { gameplay: { ...envelope.gameplay, statements: [{ ...statement, reviewed: 'yes' }] } },
  ];
  for (const mutation of corrupt) assert.throws(() => parseActionUpdate({ ...envelope, ...mutation }, action));
});

test('unchanged pin retries keep identity within a session and changed intent gets a new ID', () => {
  const session = new GameplayRequestSession('session-a');
  let sequence = 0;
  const create = () => `id-${++sequence}`;
  const first = session.requestId(statement, create);
  assert.equal(session.requestId(statement, create), first);
  assert.notEqual(session.requestId({ ...statement, turnId: 'turn-2' }, create), first);
  assert.notEqual(new GameplayRequestSession('session-b').requestId(statement, create), first);
  session.complete(statement);
  assert.notEqual(session.requestId(statement, create), first, 'confirmed success closes the retry operation');
});

test('transport posts the same retry body and exposes server errors', async t => {
  const requests: string[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: RequestInfo | URL, init?: RequestInit) => {
    requests.push(String(init?.body));
    return Response.json({ error: 'Provider unavailable.' }, { status: 503 });
  });
  const session = new GameplayRequestSession('session-a');
  const body = { sessionId: session.sessionId, requestId: session.requestId(statement), kind: 'pin', ...statement };
  await assert.rejects(session.post(body), /Provider unavailable/);
  await assert.rejects(session.post(body), /Provider unavailable/);
  assert.equal(requests[0], requests[1]);
  assert.equal(session.busy, false);
});

test('a hung evidence request has a bounded deadline and preserves its retry identity', async t => {
  const timeout = AbortSignal.timeout.bind(AbortSignal);
  t.mock.method(AbortSignal, 'timeout', (duration: number) => { assert.equal(duration, 60_000); return timeout(5); });
  t.mock.method(globalThis, 'fetch', (_url: RequestInfo | URL, options?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => reject(options.signal?.reason), { once: true });
  }));
  const keepAlive = setInterval(() => {}, 100);
  try {
    const session = new GameplayRequestSession('bounded-session');
    const requestId = session.requestId(action);
    await assert.rejects(session.post({ action, requestId }), { name: 'TimeoutError' });
    assert.equal(session.busy, false);
    assert.equal(session.requestId(action), requestId);
  } finally { clearInterval(keepAlive); }
});

test('cancellation rejects late success and prevents concurrent submission', async t => {
  let resolve!: (response: Response) => void;
  let signal: AbortSignal | undefined;
  t.mock.method(globalThis, 'fetch', (_url: RequestInfo | URL, init?: RequestInit) => {
    signal = init?.signal ?? undefined;
    return new Promise<Response>(done => { resolve = done; });
  });
  const session = new GameplayRequestSession('session-a');
  const pending = session.post({ kind: 'pin' });
  await assert.rejects(session.post({ kind: 'pin' }), /current request/);
  session.cancel();
  assert.equal(signal?.aborted, true);
  session.activate(); // React StrictMode can reactivate the same effect scope.
  resolve(Response.json(envelope));
  await assert.rejects(pending, /cancelled/);
  assert.equal(session.busy, false);
});

test('case selector offers a native authored-practice link and names free-form mode', () => {
  const markup = renderToStaticMarkup(<PracticeModeLink />);
  assert.match(markup, /href="\/game\?mode=redteam&amp;difficulty=easy"/);
  assert.match(markup, /Authored practice case/);
  assert.match(markup, /free-form generated cases/);
});


test('confirmed failed attempts require review and a new ID while uncertain outcomes preserve identity', () => {
  for (const code of ['ACTION_FAILED', 'REQUEST_INTERRUPTED']) {
    const failure = dialogueFailure(new GameplayRequestError('Failed', code));
    assert.equal(failure.requiresNewAttempt, true);
    assert.match(failure.message, /Review the preserved draft/);
  }
  for (const code of ['ACTION_IN_PROGRESS', 'STORAGE_UNAVAILABLE', null]) {
    assert.equal(dialogueFailure(new GameplayRequestError('Uncertain', code)).requiresNewAttempt, false);
  }
  assert.equal(dialogueFailure(new TypeError('Network error')).requiresNewAttempt, false);
});
