import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { POST as end } from '../app/api/session/end/route';
import { createSession, getSession, deleteSession } from '../src/lib/session/store';
import { beginSession, acceptClue } from '../src/lib/session/transitions';
import { judgeAccusation } from '../src/lib/session/accusation';
import { commitTurn } from '../src/lib/session/turn';
import { authoredCaseData } from '../src/lib/gameplay/session';
import { authorizeSpeech } from '../src/lib/voice/authorize';
import { inspectDisclosure } from '../src/lib/session/disclosure';
import { acceptedTimestamp } from '../src/lib/session/accepted-time';
import { fetchEndRemark, endings } from '../app/game/hooks/end-remark';
import { persistEnding } from '../app/game/hooks/ending-result';
import type { EndGameDeps } from '../app/game/hooks/endgame-types';

function request(sessionId: string, reason: string, requestId = randomUUID()) {
  return new NextRequest('http://localhost/api/session/end', { method: 'POST', body: JSON.stringify({ sessionId, reason, requestId }) });
}
function create() {
  const id = createSession(authoredCaseData()); const session = getSession(id)!;
  beginSession(session); return session;
}

test('giveup and timeout endings become authorized transcript speech once and preserve prior substantive response', async () => {
  for (const reason of ['giveup', 'time']) {
    const session = create();
    session.conversationHistory.push({ role: 'assistant', content: 'I left at six.' });
    if (reason === 'time') session.startTime = Date.now() - 301000;
    const id = randomUUID();
    try {
      const response = await end(request(session.id, reason, id)); const data = await response.json();
      assert.equal(response.status, 200);
      assert.equal(authorizeSpeech({ sessionId: session.id, text: data.spoken_response }).text, data.spoken_response);
      assert.equal(data.result.closest_moment, 'I left at six.');
      assert.equal(session.conversationHistory.at(-1)?.kind, 'terminal');
      assert.ok(Number.isInteger(session.conversationHistory.at(-1)?.timestamp));
      await end(request(session.id, reason, id)); await end(request(session.id, reason));
      assert.equal(session.conversationHistory.filter(message => message.kind === 'terminal').length, 1);
    } finally { deleteSession(session.id); }
  }
});

test('late timeout client recovers canonical win and preserves confession, even when browser storage throws', async () => {
  const session = create(); const originalFetch = globalThis.fetch;
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  try {
    acceptClue(session, 'Visitor record'); acceptClue(session, 'Signed arrival');
    await judgeAccusation(session, 'You returned after six', async () => ({ correct: true,
      confession: 'I returned at 18:42.', explanation: 'The signed record contradicts the denial.' }));
    const before = session.conversationHistory.length;
    globalThis.fetch = async (_url, init) => end(new NextRequest('http://localhost/api/session/end', { ...init, signal: init?.signal ?? undefined }));
    const deps = { caseData: { ...session.caseData, sessionId: session.id }, maxStress: 0 } as unknown as EndGameDeps;
    const ending = await fetchEndRemark(deps, endings.time, new AbortController().signal, randomUUID());
    assert.equal(ending.outcome, 'win'); assert.equal(ending.remark, 'I returned at 18:42.');
    assert.equal(session.conversationHistory.length, before);
    assert.equal(authorizeSpeech({ sessionId: session.id, text: ending.remark }).text, ending.remark);
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: { setItem() { throw new Error('QuotaExceededError'); } } });
    assert.equal(persistEnding(deps, ending), `/game/win?session=${session.id}`);
  } finally {
    globalThis.fetch = originalFetch; deleteSession(session.id);
    if (descriptor) Object.defineProperty(globalThis, 'sessionStorage', descriptor);
    else Reflect.deleteProperty(globalThis, 'sessionStorage');
  }
});

test('quoted internal JSON fields and direct private clues are withheld without replacing harmless spoken dialogue', () => {
  const session = create();
  try {
    for (const text of ['{"stress_triggers":["x"]}', "{'the_truth': 'x'}", 'the_contradiction = x']) {
      assert.equal(inspectDisclosure(session, text), 'internal_metadata');
    }
    session.questionsAsked = 3; session.currentStress = 8;
    const output = commitTurn(session, 'Explain what happened that evening please.', { spoken_response: 'I need a moment to remember.',
      stress_level: 8, clue_unlocked: session.caseData.the_truth, caught: false });
    assert.equal(output.spoken_response, 'I need a moment to remember.');
    assert.equal(output.clue_unlocked, null); assert.equal(session.clues.length, 0);
  } finally { deleteSession(session.id); }
});

test('canonical question and accusation timestamps use accepted elapsed whole seconds', async () => {
  const session = create(); session.startTime = Date.now() - 10500;
  try {
    commitTurn(session, 'What did you do after work?', { spoken_response: 'I left.', stress_level: 0, clue_unlocked: null, caught: false });
    acceptClue(session, 'Visitor record'); acceptClue(session, 'Signed arrival');
    await judgeAccusation(session, 'You returned after six', async () => ({ correct: false,
      confession: 'No.', explanation: 'That claim was not supported.' }));
    for (const message of session.conversationHistory) {
      assert.ok(Number.isInteger(message.timestamp)); assert.ok(message.timestamp! >= 10 && message.timestamp! <= 11);
    }
    assert.equal(acceptedTimestamp({ ...session, startTime: 1000, endedAt: 4500 }, 10000), 3);
  } finally { deleteSession(session.id); }
});

test('ending before any substantive assistant reply does not fabricate a closest moment', async () => {
  const session = create();
  try {
    const response = await end(request(session.id, 'giveup'));
    const data = await response.json();
    assert.equal(data.result.closest_moment, 'No suspect response was recorded before the interview ended.');
  } finally { deleteSession(session.id); }
});
