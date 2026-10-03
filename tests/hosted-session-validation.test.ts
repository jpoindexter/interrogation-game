import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { generationFixture } from './generation-fixtures';
import { createSession, getSession, getSessionRecord } from '../src/lib/session/store';
import { beginSession, commitAccusation, finishSession } from '../src/lib/session/transitions';
import { issueWinToken } from '../src/lib/session/tokens';
import { projectResult } from '../src/lib/session/result';
import { commitTurn } from '../src/lib/session/turn';
import { authoredCaseData, attachAuthoredGameplay, acceptAuthoredOpening, pinSessionStatement } from '../src/lib/gameplay/session';
import { prepareDialogueAction, commitDialogueAction, cancelDialogueAction } from '../src/lib/gameplay/challenges';
import { LEDGER_DEMO_CASE } from '../src/lib/gameplay/demo-case';
import { validateCaseData } from '../src/lib/session/case-validation';
import { parseHostedSessionRecord } from '../src/lib/storage/hosted/validate-session';
import { HostedStorageError } from '../src/lib/storage/hosted/rpc';
import type { HostedSnapshot } from '../src/lib/storage/hosted/contracts';
import type { SessionRecord } from '../src/lib/session/repository-types';

function snapshot(record: SessionRecord): HostedSnapshot {
  return structuredClone({ ...record, requests: {} }) as unknown as HostedSnapshot;
}

async function fixture(context: TestContext, authored = false) {
  await generationFixture(context);
  const data = authored ? authoredCaseData() : validateCaseData(authoredCaseData())!;
  const id = createSession({ ...data, playMode: 'challenge' });
  const session = getSession(id)!;
  if (authored) attachAuthoredGameplay(session);
  return { id, session, record: getSessionRecord(id)! };
}

function establishAuthored(session: ReturnType<typeof getSession> & {}) {
  beginSession(session);
  acceptAuthoredOpening(session, '*Opening*');
  const statement = pinSessionStatement(session, session.gameplay!.turns[0].id);
  const action = { id: 'challenge-0001', kind: 'present_evidence', statementId: statement.id,
    question: 'Explain the visitor record.', exhibitId: 'visitor-log' };
  const prepared = prepareDialogueAction(session.gameplay!, LEDGER_DEMO_CASE, action);
  assert.equal(prepared.kind, 'ready');
  if (prepared.kind !== 'ready') throw new Error('Expected ready action');
  commitTurn(session, action.question, { spoken_response: 'Let me explain that.', stress_level: 1, clue_unlocked: null }, { recordGameplay: false });
  commitDialogueAction(session.gameplay!, LEDGER_DEMO_CASE,
    { actionId: action.id, attempt: prepared.attempt, answer: 'Let me explain that.' });
}

function rejects(value: HostedSnapshot, label: string) {
  assert.throws(() => parseHostedSessionRecord(value), error =>
    error instanceof HostedStorageError && error.code === 'INVALID_STORAGE_RESPONSE', label);
}

test('hosted parser preserves actual domain briefing, active, authored progress and frozen win token', async context => {
  const { id, session, record } = await fixture(context, true);
  assert.deepEqual(parseHostedSessionRecord(snapshot(record)), record);
  establishAuthored(session);
  session.caseProvenance = [{ provider: 'controlled', model: 'fixture', capability: 'case', promptHash: 'b'.repeat(64) }];
  assert.deepEqual(parseHostedSessionRecord(snapshot(record)), record);
  const pending = prepareDialogueAction(session.gameplay!, LEDGER_DEMO_CASE, {
    id: 'clarify-00001', kind: 'clarify', statementId: session.gameplay!.statements[0].id, question: 'Explain that detail.',
  });
  assert.equal(pending.kind, 'ready');
  assert.deepEqual(parseHostedSessionRecord(snapshot(record)).session.gameplay?.pending, session.gameplay?.pending);
  if (pending.kind === 'ready') cancelDialogueAction(session.gameplay!, pending.action.id, pending.attempt);
  commitAccusation(session, 'Your statement about returning conflicts with the visitor record.',
    { correct: true, explanation: LEDGER_DEMO_CASE.contradictions[0].explanation });
  assert.ok(issueWinToken(id));
  projectResult(session);
  const parsed = parseHostedSessionRecord(snapshot(record));
  assert.deepEqual(parsed, record);
  assert.notEqual(parsed.session, session, 'validated data does not alias the RPC result');
  record.token!.consumed = true;
  assert.equal(parseHostedSessionRecord(snapshot(record)).token?.consumed, true);
  const brokenToken = snapshot(record);
  (brokenToken.token as SessionRecord['token'])!.snapshot.stats.score += 1;
  rejects(brokenToken, 'a token cannot mint a score that differs from server facts');
  const missingToken = snapshot(record);
  delete missingToken.token;
  rejects(missingToken, 'a session capability cannot outlive its missing token record');
});

test('hosted parser accepts generated case shape and every domain loss including giveup before Begin', async context => {
  const { session, record } = await fixture(context);
  const briefing = structuredClone(record);
  for (const outcome of ['lose_giveup', 'lose_accusations', 'lose_time', 'lose_lawyer'] as const) {
    Object.assign(session, structuredClone(briefing.session));
    if (outcome !== 'lose_giveup') beginSession(session);
    let end = Date.now();
    if (outcome === 'lose_accusations') Object.assign(session, { accusationsUsed: 3, accusationsLeft: 0 });
    if (outcome === 'lose_time') end = session.startTime + 300_000;
    if (outcome === 'lose_lawyer') {
      Object.assign(session, { timerMode: 'unlimited', highStressStreak: 4, currentStress: 9 });
      Object.assign(session.caseData, { difficulty: 'hard', playMode: 'endurance' });
    }
    finishSession(session, outcome, end);
    projectResult(session);
    assert.equal(parseHostedSessionRecord(snapshot(record)).session.outcome, outcome);
  }
  Object.assign(session, structuredClone(briefing.session));
  beginSession(session);
  commitTurn(session, 'Where were you that evening?', { spoken_response: 'I was at the office.', stress_level: 1, clue_unlocked: null });
  assert.equal(parseHostedSessionRecord(snapshot(record)).session.questionsAsked, 1);
  session.timerMode = 'unlimited';
  session.caseData.playMode = 'relaxed';
  commitAccusation(session, 'Your return contradicts the visitor record.', { correct: true, explanation: 'Controlled judgment.' });
  assert.equal(issueWinToken(session.id), null);
  projectResult(session);
  assert.equal(parseHostedSessionRecord(snapshot(record)).token, undefined);
});

test('hosted parser rejects malformed counters, times, messages, evidence, events and lifecycle fields', async context => {
  const { session, record } = await fixture(context, true);
  establishAuthored(session);
  const invalid: [string, (value: HostedSnapshot) => void][] = [
    ['session ID', value => { value.session.id = 'unknown'; }],
    ['revision', value => { value.revision = -1; }],
    ['local request ledger in hosted envelope', value => { value.requests = { bad: {} } as never; }],
    ['fractional questions', value => { value.session.questionsAsked = 1.1; }],
    ['question count differs from transcript', value => { value.session.questionsAsked = 0; }],
    ['accusation total', value => { value.session.accusationsLeft = 1; }],
    ['stress range', value => { value.session.currentStress = 10; }],
    ['reversed time', value => { value.session.startTime = 1; }],
    ['unknown outcome', value => { value.session.outcome = 'victory'; }],
    ['inconsistent active ending', value => { value.session.endedAt = Date.now(); }],
    ['invalid case', value => { (value.session.caseData as Record<string, unknown>).difficulty = 'nightmare'; }],
    ['inconsistent clock mode', value => { (value.session.caseData as Record<string, unknown>).playMode = 'relaxed'; }],
    ['invalid role', value => { (value.session.conversationHistory as Record<string, unknown>[])[0].role = 'system'; }],
    ['malformed clue', value => { value.session.clues = [{ id: 'clue-1', text: 4 }]; value.session.cluesCollected = 1; }],
    ['invalid provenance', value => { value.session.caseProvenance = [{ provider: 'test' }]; }],
    ['foreign accepted turn', value => { (value.session.acceptedTurns as Record<string, unknown>[])[0].messageIndex = 100; }],
    ['foreign gameplay session', value => { (value.session.gameplay as Record<string, unknown>).sessionId = 'c'.repeat(48); }],
    ['invalid statement binding', value => {
      const game = value.session.gameplay as Record<string, unknown>;
      (game.statements as Record<string, unknown>[])[0].claimId = 'unknown';
    }],
    ['invented progress', value => { (value.session.gameplay as Record<string, unknown>).establishedContradictionIds = ['unknown']; }],
    ['invalid receipt verdict', value => {
      const game = value.session.gameplay as Record<string, unknown>;
      const receipts = game.receipts as Record<string, { result: Record<string, unknown> }>;
      receipts['challenge-0001'].result.status = 'dialogue_only';
    }],
    ['malformed pending action', value => { (value.session.gameplay as Record<string, unknown>).pending = { action: {} }; }],
    ['token on active game', value => { value.token = {}; }],
  ];
  for (const [label, mutate] of invalid) {
    const value = snapshot(record);
    mutate(value);
    rejects(value, label);
  }
});
