import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  LEDGER_DEMO_CASE as caseData, createGameplayState, recordGameplayTurn, pinStatement,
  bindAuthoredStatement, prepareDialogueAction, commitDialogueAction, cancelDialogueAction,
  publicGameplayState, projectEvidenceResult, parseDialogueAction, validateGameplayCase,
  draftDialogue, DIALOGUE_OPTIONS,
} from '../src/lib/gameplay';
import type { DialogueAction, GameplayState } from '../src/lib/gameplay';

function setup(answer = caseData.opening, sessionId = 'demo-session') {
  const state = createGameplayState(sessionId, caseData);
  const turn = recordGameplayTurn(state, { question: 'Where were you that evening?', answer });
  const statement = pinStatement(state, turn.id);
  bindAuthoredStatement(state, caseData, statement.id);
  return { state, statement };
}
function action(state: GameplayState, patch: Partial<DialogueAction> = {}): DialogueAction {
  return { id: 'question-001', kind: 'present_evidence', statementId: state.statements[0].id,
    question: 'Then explain this.', exhibitId: 'visitor-log', ...patch };
}
function execute(state: GameplayState, input = action(state), answer = 'I need to check that entry.') {
  const prepared = prepareDialogueAction(state, caseData, input);
  assert.equal(prepared.kind, 'ready');
  if (prepared.kind !== 'ready') throw new Error('Expected a prepared action');
  return commitDialogueAction(state, caseData, { actionId: input.id, attempt: prepared.attempt, answer });
}

test('public projection exposes discovered sources but no authored truths or hidden exhibits', () => {
  const { state } = setup();
  const view = publicGameplayState(state, caseData);
  const serialized = JSON.stringify(view);
  assert.equal(view.exhibits.length, 2);
  assert.ok(!serialized.includes('sealed-note'));
  assert.ok(!serialized.includes(caseData.claims[0].truth));
  assert.ok(!serialized.includes('claimId'));
  assert.ok(!serialized.includes('contradictions'));
  assert.throws(() => projectEvidenceResult(state, caseData), /End the interrogation/);
});

test('valid short evidence challenge advances exactly one canonical contradiction', () => {
  const { state } = setup();
  const result = execute(state);
  assert.equal(result.status, 'contradiction_established');
  assert.equal(result.progressAdded, true);
  assert.equal(result.establishedCount, 1);
  assert.equal(state.turns.at(-1)?.answer, result.answer);
  assert.equal(state.status, 'active', 'A challenge alone must not win the game');
});

test('irrelevant evidence gives a grounded non-success without inventing guilt', () => {
  const { state } = setup();
  const result = execute(state, action(state, { exhibitId: 'badge-record' }));
  assert.equal(result.status, 'not_established');
  assert.equal(result.progressAdded, false);
  assert.equal(result.establishedCount, 0);
  assert.match(result.explanation, /does not establish/);
});

test('clarify and leave-space are distinct editable dialogue actions with no automatic reward', () => {
  const { state, statement } = setup();
  const drafts = DIALOGUE_OPTIONS.map(option => draftDialogue(option.kind, statement));
  assert.equal(new Set(drafts).size, 3);
  for (const kind of ['clarify', 'leave_space'] as const) {
    const result = execute(state, action(state, { id: `question-${kind.replaceAll('_', '-')}`, kind, question: 'My own edited question' }));
    assert.equal(result.status, 'dialogue_only');
    assert.equal(result.progressAdded, false);
    assert.equal(state.turns.at(-1)?.question, 'My own edited question');
  }
});

test('same action is replayable; same evidence under a new request cannot farm progress', () => {
  const { state } = setup();
  const first = execute(state);
  const replay = prepareDialogueAction(state, caseData, action(state));
  assert.equal(replay.kind, 'replay');
  if (replay.kind === 'replay') assert.deepEqual(replay.result, first);
  assert.equal(state.turns.length, 2);
  const repeated = execute(state, action(state, { id: 'question-002', question: 'Explain that record again.' }));
  assert.equal(repeated.status, 'contradiction_established');
  assert.equal(repeated.progressAdded, false);
  assert.equal(repeated.establishedCount, 1);
});

test('request ID conflicts and concurrent actions cannot create duplicate events', () => {
  const { state } = setup();
  const first = prepareDialogueAction(state, caseData, action(state));
  assert.equal(first.kind, 'ready');
  assert.equal(prepareDialogueAction(state, caseData, action(state)).kind, 'pending');
  assert.throws(() => prepareDialogueAction(state, caseData, action(state, { id: 'question-002' })), /in progress/);
  assert.equal(state.turns.length, 1);
  if (first.kind !== 'ready') throw new Error('No action');
  commitDialogueAction(state, caseData, { actionId: 'question-001', attempt: first.attempt, answer: 'That is my signature.' });
  assert.throws(() => prepareDialogueAction(state, caseData, action(state, { question: 'A different question' })), /already used/);
});

test('failed provider responses commit nothing and retry safely rejects stale attempts', () => {
  const { state } = setup();
  const first = prepareDialogueAction(state, caseData, action(state));
  if (first.kind !== 'ready') throw new Error('No action');
  assert.throws(() => commitDialogueAction(state, caseData, { actionId: first.action.id, attempt: first.attempt, answer: '' }), /could not be accepted/);
  assert.equal(state.turns.length, 1);
  assert.equal(state.establishedContradictionIds.length, 0);
  cancelDialogueAction(state, first.action.id, first.attempt);
  const retry = prepareDialogueAction(state, caseData, action(state));
  if (retry.kind !== 'ready') throw new Error('No retry');
  assert.throws(() => commitDialogueAction(state, caseData, { actionId: first.action.id, attempt: first.attempt, answer: 'Old late response' }), /Prepare this action/);
  cancelDialogueAction(state, first.action.id, first.attempt);
  assert.ok(state.pending, 'Old cancellation must not cancel a newer attempt');
  commitDialogueAction(state, caseData, { actionId: retry.action.id, attempt: retry.attempt, answer: 'Current accepted response' });
  assert.equal(state.turns.at(-1)?.answer, 'Current accepted response');
});

test('foreign statements and unavailable exhibits fail before any provider preparation', () => {
  const { state } = setup();
  const foreign = setup(caseData.opening, 'other-session');
  assert.throws(() => prepareDialogueAction(state, caseData, action(state, { statementId: foreign.statement.id })), /this interrogation/);
  for (const exhibitId of ['sealed-note', 'invented-exhibit']) {
    assert.throws(() => prepareDialogueAction(state, caseData, action(state, { exhibitId })), /not available/);
  }
  assert.equal(state.pending, null);
});

test('alternate authored assertions remain valid paths to the same grounded result', () => {
  for (const assertion of caseData.claims[0].alternateAssertions) {
    const { state, statement } = setup(assertion);
    execute(state);
    state.status = 'ended';
    const [result] = projectEvidenceResult(state, caseData);
    assert.equal(result.statement.quote, assertion);
    assert.equal(result.statement.id, statement.id);
    assert.equal(result.truth, caseData.claims[0].truth);
    assert.equal(result.exhibit.id, 'visitor-log');
  }
});

test('a quoted or negated assertion cannot acquire canonical binding by substring', () => {
  const state = createGameplayState('quoted-session', caseData);
  const turn = recordGameplayTurn(state, { question: 'Did you say this?', answer: `I never said: ${caseData.opening}` });
  const statement = pinStatement(state, turn.id, caseData.opening);
  assert.throws(() => bindAuthoredStatement(state, caseData, statement.id), /no reviewed factual binding/);
  const result = execute(state);
  assert.equal(result.status, 'unreviewed_statement');
});

test('results cite the actual challenged statement when earlier related claims exist', () => {
  const { state } = setup();
  const turn = recordGameplayTurn(state, { question: 'To clarify?', answer: caseData.claims[0].alternateAssertions[0] });
  const later = pinStatement(state, turn.id);
  bindAuthoredStatement(state, caseData, later.id);
  execute(state, action(state, { statementId: later.id }));
  state.status = 'ended';
  assert.equal(projectEvidenceResult(state, caseData)[0].statement.id, later.id);
});

test('terminal state rejects new actions and late provider mutation but keeps replay receipts', () => {
  const { state } = setup();
  const result = execute(state);
  state.status = 'ended';
  assert.throws(() => prepareDialogueAction(state, caseData, action(state, { id: 'question-002' })), /has ended/);
  assert.throws(() => pinStatement(state, state.turns[0].id), /has ended/);
  const replay = prepareDialogueAction(state, caseData, action(state));
  if (replay.kind === 'replay') assert.deepEqual(replay.result, result);
  else assert.fail('Expected immutable replay');
});

test('browser parser discards injected factual authority and receipt prototype names are safe', () => {
  const { state } = setup();
  const raw = { ...action(state, { id: 'constructor' }), claimId: 'departure', correct: true, hiddenTruth: 'invented' };
  const parsed = parseDialogueAction(raw);
  assert.ok(!('claimId' in parsed));
  assert.ok(!('correct' in parsed));
  assert.equal(execute(state, parsed).progressAdded, true);
});

test('invalid authored graph cannot produce an impossible initial case', () => {
  assert.throws(() => validateGameplayCase({ ...caseData, contradictions: [] }), /initial evidence/);
  assert.throws(() => validateGameplayCase({ ...caseData, contradictions: [{ ...caseData.contradictions[0], exhibitId: 'missing' }] }), /existing claims/);
});
