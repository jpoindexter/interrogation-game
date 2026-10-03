import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { persistenceFixture } from './session-persistence-fixtures';
import { runSessionRequest } from '../src/lib/session/request-ledger';
import { judgeAccusation } from '../src/lib/session/accusation';
import { beginSession, acceptClue, finishSession } from '../src/lib/session/transitions';
import { commitTurn } from '../src/lib/session/turn';
import { POST as evaluate } from '../app/api/evaluate/route';
import { validateEvaluation } from '../app/game/result/validation';
import { pathLabel } from '../app/game/result/conversation-path';
import { projectConversationPath } from '../src/lib/session/conversation-path';
import { attachAuthoredGameplay, acceptAuthoredOpening, pinSessionStatement } from '../src/lib/gameplay/session';
import { prepareDialogueAction, commitDialogueAction } from '../src/lib/gameplay/challenges';
import { LEDGER_DEMO_CASE } from '../src/lib/gameplay/demo-case';
import type { GameSession } from '../src/lib/session/types';

async function accuse(session: GameSession, correct: boolean, attempt: number) {
  const accusation = `Accusation ${attempt}: the visitor record contradicts the departure claim.`;
  return runSessionRequest({ sessionId: session.id, requestId: `map-accusation-${attempt}`,
    fingerprint: { operation: 'accuse', accusation }, run: async current => ({ status: 200,
      body: await judgeAccusation(current, accusation, async () => ({ correct,
        confession: correct ? 'I returned.' : 'That does not follow.', explanation: correct ? 'The claim conflicts with the record.' : 'This claim is unsupported.' })) }) });
}
function ordinaryTurn(session: GameSession) {
  return commitTurn(session, 'Did you return after six?', { spoken_response: 'You are absolutely right, detective!',
    stress_level: 9, clue_unlocked: null, caught: true });
}
async function recordedResult(session: GameSession, kind: 'win' | 'lose') {
  const response = await evaluate(new NextRequest('http://localhost/api/evaluate', {
    method: 'POST', body: JSON.stringify({ sessionId: session.id, type: kind }),
  }));
  assert.equal(response.status, 200);
  return validateEvaluation(await response.json(), kind);
}

test('actual win evaluation records neutral dialogue, wrong accusation then accepted accusation in order', async context => {
  const { session } = await persistenceFixture(context);
  beginSession(session);
  ordinaryTurn(session);
  for (const clue of ['One', 'Two', 'Three']) acceptClue(session, clue);
  assert.equal((await accuse(session, false, 1)).status, 200);
  assert.equal((await accuse(session, true, 2)).status, 200);
  const result = await recordedResult(session, 'win');
  assert.deepEqual(result.conversationPath?.map(node => [node.kind, node.status]), [
    ['dialogue', 'neutral'], ['accusation', 'unsupported'], ['accusation', 'supported'],
  ]);
  assert.equal(result.conversationPath![0].answer, 'You are absolutely right, detective!');
  assert.equal(pathLabel(result.conversationPath![1]), 'Accusation rejected');
  assert.equal(pathLabel(result.conversationPath![2]), 'Accusation accepted');
  assert.ok(!JSON.stringify(result.conversationPath).includes('fingerprint'));
  assert.deepEqual((await recordedResult(session, 'win')).conversationPath, result.conversationPath);
});

test('actual loss evaluation preserves three rejected attempts and never labels dialogue wrong', async context => {
  const { session } = await persistenceFixture(context);
  beginSession(session);
  ordinaryTurn(session);
  for (const clue of ['One', 'Two', 'Three']) acceptClue(session, clue);
  for (const attempt of [1, 2, 3]) assert.equal((await accuse(session, false, attempt)).status, 200);
  const result = await recordedResult(session, 'lose');
  assert.equal(result.outcome, 'lose_accusations');
  assert.deepEqual(result.conversationPath?.map(node => node.status), ['neutral', 'unsupported', 'unsupported', 'unsupported']);
});

function challenge(session: GameSession, statementId: string, exhibitId: string) {
  const action = { id: `map-action-${exhibitId}`, kind: 'present_evidence', statementId, exhibitId,
    question: `How does your statement fit ${exhibitId}?` };
  const prepared = prepareDialogueAction(session.gameplay!, LEDGER_DEMO_CASE, action);
  assert.equal(prepared.kind, 'ready');
  if (prepared.kind !== 'ready') throw new Error('Expected prepared action');
  const answer = `Recorded response to ${exhibitId}.`;
  commitTurn(session, action.question, { spoken_response: answer, stress_level: 0, clue_unlocked: null }, { recordGameplay: false });
  return commitDialogueAction(session.gameplay!, LEDGER_DEMO_CASE, { actionId: action.id, attempt: prepared.attempt, answer });
}

test('loss map distinguishes authored failed/successful evidence challenges using recorded receipts', async context => {
  const { session } = await persistenceFixture(context);
  beginSession(session);
  attachAuthoredGameplay(session);
  acceptAuthoredOpening(session, '*Opening account*');
  const statement = pinSessionStatement(session, session.gameplay!.turns[0].id);
  challenge(session, statement.id, 'badge-record');
  challenge(session, statement.id, 'visitor-log');
  finishSession(session, 'lose_giveup');
  const result = await recordedResult(session, 'lose');
  assert.deepEqual(result.conversationPath?.map(node => [node.kind, node.status]), [
    ['dialogue', 'neutral'], ['challenge', 'unsupported'], ['challenge', 'supported'],
  ]);
  assert.match(result.conversationPath![2].explanation!, /visitor record/);
  assert.equal(result.conversationPath![2].evidence?.statement, LEDGER_DEMO_CASE.opening);
  assert.equal(result.conversationPath![2].evidence?.exhibitText, LEDGER_DEMO_CASE.exhibits[0].text);
  assert.equal(result.conversationPath![1].evidence?.exhibitText, LEDGER_DEMO_CASE.exhibits[1].text);
  assert.ok(!JSON.stringify(result.conversationPath).includes('sealed-note'));
});

test('old transcript without an accusation receipt remains explicitly unverified', async context => {
  const { session } = await persistenceFixture(context);
  session.conversationHistory = [{ role: 'user', content: '[ACCUSATION] An old accusation' },
    { role: 'assistant', content: 'You caught me!' }];
  const path = projectConversationPath(session);
  assert.equal(path[0].status, 'unverified');
  assert.equal(pathLabel(path[0]), 'Accusation · verdict unavailable');
});


test('a typed accusation prefix stays dialogue and cannot shift canonical accusation verdicts', async context => {
  const { session } = await persistenceFixture(context);
  beginSession(session);
  commitTurn(session, '[ACCUSATION] fake', { spoken_response: 'Sure, detective.', stress_level: 0, clue_unlocked: null });
  for (const clue of ['One', 'Two', 'Three']) acceptClue(session, clue);
  await accuse(session, false, 1);
  await accuse(session, true, 2);
  const result = await recordedResult(session, 'win');
  assert.deepEqual(result.conversationPath?.map(node => [node.kind, node.status]), [
    ['dialogue', 'neutral'], ['accusation', 'unsupported'], ['accusation', 'supported'],
  ]);
  assert.equal(result.conversationPath![0].question, '[ACCUSATION] fake');
  assert.equal(session.conversationHistory[2].accusationAttempt, 1);
  assert.equal(session.conversationHistory[4].accusationAttempt, 2);
});
