import { publicClues } from '../src/lib/session/clue-sources';
import { parsePublicClue } from '../src/lib/clue-contract';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSession, getSession, deleteSession, acquireSessionLock, releaseSessionLock } from '../src/lib/session/store';
import { beginSession, acceptClue, expireSession, finishSession } from '../src/lib/session/transitions';
import { commitTurn, prepareTurn } from '../src/lib/session/turn';
import { judgeAccusation } from '../src/lib/session/accusation';
import { getSessionStats } from '../src/lib/session/stats';
import { projectResult } from '../src/lib/session/result';
import { consumeWinToken } from '../src/lib/session/tokens';
import { validateCaseData } from '../src/lib/session/case-validation';
import { TIME_LIMITS } from '../src/lib/game-state';

const facts = {
  difficulty: 'easy', case_number: 'TEST-1', setting: 'bank', crime: 'A missing ledger',
  briefing: 'Investigate the ledger disappearance', suspect_name: 'Casey', suspect_gender: 'female',
  suspect_role: 'Manager', suspect_true_story: 'Moved the ledger', suspect_cover_story: 'Stayed home',
  the_lie: 'A completely secret alibi', the_truth: 'Vault chamber midnight removal',
  the_contradiction: 'Fingerprint timestamp establishes presence', stress_triggers: ['ledger'],
  deflection_tactics: ['Question the evidence'],
};
function makeSession(mode: 'countdown' | 'unlimited' = 'countdown', difficulty = 'easy') {
  const id = createSession({ ...facts, difficulty }, [], 0, mode);
  return getSession(id)!;
}
function readyToAccuse() {
  const session = makeSession();
  beginSession(session);
  acceptClue(session, 'The access card was used.');
  acceptClue(session, 'The train schedule contradicts your account.');
  return session;
}
const wrong = { correct: false, confession: 'That is not what happened.', explanation: 'The evidence does not match.' };

test('generated accusations are judged on the claim without requiring stress-unlocked clue markers', async () => {
  const session = makeSession();
  beginSession(session);
  assert.equal(session.clues.length, 0);
  const rejected = await judgeAccusation(session, 'An unsupported accusation', async () => wrong);
  assert.equal(rejected.correct, false);
  assert.equal(session.accusationsLeft, 2);
  const accepted = await judgeAccusation(session, 'The witness contradicts your alibi', async () => ({
    correct: true, confession: 'The alibi was false.', explanation: 'The named witness contradicts the denial.',
  }));
  assert.equal(accepted.correct, true);
  assert.equal(session.outcome, 'win');
  assert.equal(session.clues.length, 0);
  deleteSession(session.id);
});

test('case evidence releases once; blocked answers add no progress and source preserves the accompanying exchange', () => {
  const session = makeSession();
  beginSession(session);
  const response = { spoken_response: 'I remember hearing a noise.', stress_level: 0, clue_unlocked: 'Invented model clue', caught: false };
  commitTurn(session, 'Who heard the sound at the office?', response);
  commitTurn(session, 'What happened near the locked door?', response);
  const blocked = commitTurn(session, 'When did the sound occur near the office?', { ...response, spoken_response: facts.the_truth });
  assert.equal(blocked.clue_unlocked, null); assert.equal(session.cluesCollected, 0);
  assert.equal(session.conversationHistory.at(-1)?.content, blocked.spoken_response);
  assert.ok(!session.conversationHistory.some(message => message.content === facts.the_truth));
  const first = commitTurn(session, 'How can we verify the office account?', response);
  const repeat = commitTurn(session, 'How can we verify the office account!', response);
  assert.equal(first.clue_unlocked, facts.the_contradiction);
  assert.equal(first.clues[0].origin, 'case-record');
  const source = first.clues[0].source!;
  assert.deepEqual(source, { turnId: 'accepted-turn:6', messageIndex: 6,
    question: 'How can we verify the office account?', answer: response.spoken_response });
  assert.deepEqual(parsePublicClue(JSON.parse(JSON.stringify(first.clues[0]))).source, source);
  assert.deepEqual(publicClues(session)[0].source, source);
  assert.equal('provenance' in source, false);
  assert.equal(publicClues({ ...session, acceptedTurns: undefined })[0].source, null);
  assert.throws(() => parsePublicClue({ ...first.clues[0], source: { ...source, messageIndex: -1 } }));
  assert.equal(repeat.clue_unlocked, null); assert.equal(session.cluesCollected, 1);
  deleteSession(session.id);
});

test('all difficulty countdowns expire exactly at shared boundary; unlimited does not', () => {
  for (const [difficulty, seconds] of Object.entries(TIME_LIMITS)) {
    for (const mode of ['countdown', 'unlimited'] as const) {
      const session = makeSession(mode, difficulty);
      const now = Date.now();
      beginSession(session, now);
      assert.equal(expireSession(session, now + seconds * 1000 - 1), false);
      assert.equal(expireSession(session, now + seconds * 1000), mode === 'countdown');
      if (mode === 'unlimited') assert.equal(expireSession(session, now + 7200000), false);
      deleteSession(session.id);
    }
  }
});

test('malformed or failed judgments spend no attempts or question count', async () => {
  const session = readyToAccuse();
  const invalid = [{}, { correct: 'false' }, { correct: false, confession: '', explanation: '' }];
  for (const result of invalid) await assert.rejects(judgeAccusation(session, 'You moved the ledger', async () => result));
  await assert.rejects(judgeAccusation(session, 'You moved the ledger', async () => { throw new Error('Provider timeout'); }));
  assert.equal(session.accusationsLeft, 3);
  assert.equal(session.accusationsUsed, 0);
  assert.equal(session.conversationHistory.length, 0);
  await judgeAccusation(session, 'You moved the ledger', async () => wrong);
  assert.equal(session.accusationsLeft, 2);
  assert.equal(session.accusationsUsed, 1);
  assert.equal(getSessionStats(session.id)?.questionsAsked, 0);
  deleteSession(session.id);
});

test('a correct verdict freezes facts, time and score; later play cannot change result', async () => {
  const session = readyToAccuse();
  const result = await judgeAccusation(session, 'You lied about being home', async () => ({ ...wrong, correct: true }));
  const debrief = projectResult(session);
  assert.equal(debrief.correct, true);
  assert.equal(debrief.reveal_the_truth, facts.the_truth);
  const stats = getSessionStats(session.id);
  assert.equal(prepareTurn(session), 'win');
  finishSession(session, 'lose_giveup');
  assert.deepEqual(getSessionStats(session.id), stats);
  assert.deepEqual(projectResult(session), debrief);
  await assert.rejects(judgeAccusation(session, 'Another accusation', async () => wrong));
  assert.equal(consumeWinToken(session.id, result.winToken!), true);
  assert.equal(consumeWinToken(session.id, result.winToken!), false);
  deleteSession(session.id);
});

test('early evaluation is rejected and expired accusation cannot call judge', async () => {
  const session = readyToAccuse();
  assert.throws(() => projectResult(session), /has not ended/);
  session.startTime = Date.now() - 301000;
  let calls = 0;
  await assert.rejects(judgeAccusation(session, 'Your alibi is false', async () => { calls += 1; return wrong; }));
  assert.equal(calls, 0);
  assert.equal(session.outcome, 'lose_time');
  assert.equal(session.accusationsUsed, 0);
  assert.equal(projectResult(session).outcome, 'lose_time');
  deleteSession(session.id);
});

test('provider response after deadline is discarded without consuming accusation', async () => {
  const session = readyToAccuse();
  await assert.rejects(judgeAccusation(session, 'Your alibi is false', async () => {
    session.startTime = Date.now() - 301000;
    return wrong;
  }));
  assert.equal(session.outcome, 'lose_time');
  assert.equal(session.accusationsUsed, 0);
  deleteSession(session.id);
});

test('session lock prevents simultaneous finalize or question, releases for next action', () => {
  const session = makeSession();
  assert.equal(acquireSessionLock(session.id), true);
  assert.equal(acquireSessionLock(session.id), false);
  releaseSessionLock(session.id);
  assert.equal(acquireSessionLock(session.id), true);
  releaseSessionLock(session.id);
  deleteSession(session.id);
});

test('briefing time is excluded and loss reasons are immutable', () => {
  const session = makeSession();
  session.createdAt -= 60000;
  assert.equal(getSessionStats(session.id)?.timeElapsed, 0);
  prepareTurn(session);
  assert.ok(getSessionStats(session.id)!.timeElapsed < 1);
  finishSession(session, 'lose_giveup');
  assert.equal(session.outcome, 'lose_giveup');
  finishSession(session, 'lose_time');
  assert.equal(projectResult(session).outcome, 'lose_giveup');
  deleteSession(session.id);
});

test('generated case structural gate rejects blank facts, invalid difficulty and empty triggers', () => {
  assert.ok(validateCaseData(facts));
  assert.equal(validateCaseData({ ...facts, verbal_tics: '  Clears throat  ' })?.verbal_tics, 'Clears throat');
  assert.equal(validateCaseData({ ...facts, verbal_tics: 4 }), null);
  for (const patch of [{ the_lie: '  ' }, { difficulty: 'impossible' }, { stress_triggers: [''] },
    { deflection_tactics: [null] }, { the_truth: facts.the_lie }]) {
    assert.equal(validateCaseData({ ...facts, ...patch }), null);
  }
});

test('lawyer-up response is the persisted, speakable text and retains precise outcome', () => {
  const session = makeSession('unlimited', 'hard');
  session.caseData.playMode = 'endurance';
  beginSession(session);
  session.currentStress = 8;
  let shown = '';
  for (let index = 0; index < 4; index++) {
    const response = commitTurn(session, 'Explain what happened in the interview room.', {
      spoken_response: 'I heard something.', stress_level: 8, clue_unlocked: null, caught: false,
    });
    shown = response.spoken_response;
  }
  assert.equal(session.outcome, 'lose_lawyer');
  assert.equal(session.conversationHistory.at(-1)?.content, shown);
  assert.match(shown, /lawyer/);
  assert.equal(projectResult(session).outcome, 'lose_lawyer');
  deleteSession(session.id);
});

test('three valid wrong accusations produce exhausted-attempt outcome once', async () => {
  const session = readyToAccuse();
  for (let index = 0; index < 3; index++) await judgeAccusation(session, `Wrong claim ${index}`, async () => wrong);
  assert.equal(session.outcome, 'lose_accusations');
  assert.equal(session.accusationsUsed, 3);
  assert.equal(session.accusationsLeft, 0);
  await assert.rejects(judgeAccusation(session, 'Fourth claim', async () => wrong));
  assert.equal(projectResult(session).outcome, 'lose_accusations');
  deleteSession(session.id);
});

test('legacy unlimited sessions remain relaxed without hidden lawyer escalation', () => {
  const session = makeSession('unlimited', 'expert');
  beginSession(session); session.currentStress = 8;
  try {
    for (let turn = 0; turn < 6; turn++) commitTurn(session, 'Explain what you remember about that evening.', {
      spoken_response: 'I need a moment to recall it.', stress_level: 8, clue_unlocked: null, caught: false,
    });
    assert.equal(session.outcome, null); assert.equal(session.questionsAsked, 6);
  } finally { deleteSession(session.id); }
});
