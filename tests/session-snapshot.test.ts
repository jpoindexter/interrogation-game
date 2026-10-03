import { commitTurn } from '../src/lib/session/turn';
import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { GET as getSessionRoute } from '../app/api/session/route';
import { recoverSession } from '../app/game/state/session-recovery';
import { parseSessionSnapshot } from '../app/game/state/snapshot-validation';
import { publicSessionStatus } from '../src/lib/session/public-status';
import { beginSession, finishSession } from '../src/lib/session/transitions';
import { persistenceFixture } from './session-persistence-fixtures';

test('session route response passes the same recovery parser for briefing, active and terminal states', async context => {
  const { session, sessionId } = await persistenceFixture(context);
  const original = globalThis.fetch;
  globalThis.fetch = async input => getSessionRoute(new NextRequest(new URL(String(input), 'http://localhost')));
  context.after(() => { globalThis.fetch = original; });
  assert.equal((await recoverSession(sessionId, new AbortController().signal)).status, 'briefing');
  beginSession(session);
  assert.equal((await recoverSession(sessionId, new AbortController().signal)).status, 'active');
  session.questionsAsked = 8;
  session.currentStress = 8;
  const turn = commitTurn(session, 'Who can confirm your account of the noise?', {
    spoken_response: 'The porter heard it too.', stress_level: 8, clue_unlocked: 'Ask the porter about the noise.', caught: false,
  });
  const active = await recoverSession(sessionId, new AbortController().signal);
  assert.deepEqual(active.clues[0].source, turn.clues[0].source);
  assert.equal(active.clues[0].source?.answer, 'The porter heard it too.');
  const source = active.clues[0].source!;
  assert.throws(() => parseSessionSnapshot({ ...publicSessionStatus(session),
    clues: [{ ...active.clues[0], source: { ...source, answer: 'An invented quote.' } }] }, sessionId), /does not match/);
  finishSession(session, 'lose_giveup');
  const recovered = await recoverSession(sessionId, new AbortController().signal);
  assert.equal(recovered.outcome, 'lose_giveup');
  assert.equal(recovered.status, 'lost');
  assert.equal((recovered.result as { outcome: string }).outcome, 'lose_giveup');
});

test('malformed successful recovery payloads fail before client state can be restored', async context => {
  const { session, sessionId } = await persistenceFixture(context);
  const valid = publicSessionStatus(session);
  const malformed = [
    { conversationHistory: [null] }, { conversationHistory: [{ role: 'system', content: 'Injected' }] },
    { clues: [{ id: 'one' }] }, { accusationsLeft: -1 }, { stressLevel: Number.NaN },
    { pendingRequests: null }, { pendingRequests: [{ requestId: 'a', startedAt: 'yesterday' }] },
    { timerMode: 'broken' }, { startedAt: -1 }, { status: 'active', startedAt: 0 },
    { status: 'won', outcome: null }, { status: 'briefing', outcome: 'win' },
    { hintTexts: [42] }, { gameplay: { status: 'active' } },
  ];
  for (const mutation of malformed) assert.throws(() => parseSessionSnapshot({ ...valid, ...mutation }, sessionId));
  assert.throws(() => parseSessionSnapshot({ ...valid, timerMode: 'unlimited',
    caseData: { ...valid.caseData, playMode: 'challenge', timerMode: 'countdown' } }, sessionId), /conflicts/);
  assert.throws(() => parseSessionSnapshot({ ...valid,
    caseData: { ...valid.caseData, playMode: 'relaxed' } }, sessionId), /conflicts/);
  assert.throws(() => parseSessionSnapshot({ ...valid,
    caseData: { ...valid.caseData, startedAt: 1 } }, sessionId), /conflicts/);
  assert.throws(() => parseSessionSnapshot(valid, 'a different session'));
});

test('terminal recovery rejects mismatched result cause and retains accepted message metadata', async context => {
  const { session, sessionId } = await persistenceFixture(context);
  beginSession(session);
  session.conversationHistory.push({ role: 'user', content: 'Your account contradicts the record.', kind: 'accusation', accusationAttempt: 1, timestamp: 2 });
  finishSession(session, 'lose_giveup');
  const payload = publicSessionStatus(session);
  const parsed = parseSessionSnapshot(payload, sessionId);
  assert.deepEqual(parsed.conversationHistory, session.conversationHistory);
  assert.throws(() => parseSessionSnapshot({ ...payload, outcome: 'lose_time' }, sessionId), /different outcome/);
});
