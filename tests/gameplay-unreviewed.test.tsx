import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createSession, getSession, deleteSession } from '../src/lib/session/store';
import { beginSession } from '../src/lib/session/transitions';
import { commitTurn } from '../src/lib/session/turn';
import { authoredCaseData, attachAuthoredGameplay, acceptAuthoredOpening, pinSessionStatement } from '../src/lib/gameplay/session';
import { LEDGER_DEMO_CASE } from '../src/lib/gameplay/demo-case';
import { prepareDialogueAction, commitDialogueAction } from '../src/lib/gameplay/challenges';
import { publicGameplayState } from '../src/lib/gameplay/projection';
import { projectConversationPath } from '../src/lib/session/conversation-path';
import { pathLabel } from '../app/game/result/conversation-path';
import { parseGameplayProjection, parseActionUpdate } from '../app/game/playbook/response-parser';
import SourcePicker from '../app/game/playbook/SourcePicker';
import ChallengeFeedback from '../app/game/playbook/ChallengeFeedback';

// Exact spoken response observed in the ten-item live evaluation, reused without another model call.
const liveParaphrase = 'I left at six and didn’t come back that evening. That’s my account.';
const noop = () => {};

test('a legitimate live paraphrase is unreviewed, never falsely classified as wrong evidence', () => {
  const id = createSession(authoredCaseData()); const session = getSession(id)!;
  beginSession(session); attachAuthoredGameplay(session); acceptAuthoredOpening(session, '*Detective sits down*');
  try {
    commitTurn(session, 'Repeat your account.', { spoken_response: liveParaphrase, stress_level: 1, clue_unlocked: null, caught: false });
    const state = session.gameplay!; const turn = state.turns.at(-1)!;
    const statement = pinSessionStatement(session, turn.id, turn.answer);
    assert.equal(statement.reviewed, false);
    const action = { id: 'unreviewed-repro-01', kind: 'present_evidence' as const, statementId: statement.id,
      exhibitId: 'visitor-log', question: 'The signed 18:42 arrival contradicts that denial.' };
    const prepared = prepareDialogueAction(state, LEDGER_DEMO_CASE, action);
    assert.equal(prepared.kind, 'ready'); if (prepared.kind !== 'ready') throw new Error('Expected ready');
    const answer = 'I stand by my account.';
    commitTurn(session, action.question, { spoken_response: answer, stress_level: 1, clue_unlocked: null, caught: false }, { recordGameplay: false });
    const result = commitDialogueAction(state, LEDGER_DEMO_CASE, { actionId: action.id, attempt: prepared.attempt, answer });
    assert.equal(result.status, 'unreviewed_statement'); assert.equal(result.progressAdded, false);
    assert.equal(state.establishedContradictionIds.length, 0);
    assert.match(result.explanation, /has not been reviewed/); assert.match(result.explanation, /original opening account/);
    const view = parseGameplayProjection(publicGameplayState(state, LEDGER_DEMO_CASE));
    assert.equal(view.turns[0].reviewed, true); assert.equal(view.turns[1].reviewed, false);
    assert.equal(view.statements[0].reviewed, false);
    assert.ok(!JSON.stringify(view).includes('claimId'));
    assert.ok(!JSON.stringify(view).includes(LEDGER_DEMO_CASE.claims[0].truth));
    const parsed = parseActionUpdate({ result, gameplay: view, response: answer, clues: [], stressLevel: 1, startedAt: session.startTime }, action);
    assert.equal(parsed.result.status, 'unreviewed_statement');
    const node = projectConversationPath(session).at(-1)!;
    assert.equal(node.status, 'unverified'); assert.equal(pathLabel(node), 'Statement not reviewed');
    const feedback = renderToStaticMarkup(<ChallengeFeedback result={result} projection={view} pinned={statement} onSource={noop} />);
    assert.match(feedback, /Statement not reviewed/); assert.doesNotMatch(feedback, /Contradiction not established/);
    const picker = renderToStaticMarkup(<SourcePicker turns={view.turns} source={view.turns[1]} pinned={statement}
      disabled={false} pending={false} onSelect={noop} onPin={noop} onUnpin={noop} onSource={noop} />);
    assert.match(picker, /reviewed wording/); assert.match(picker, /choose the reviewed opening account/);
    assert.ok(Number.isInteger(session.conversationHistory[0].timestamp));
  } finally { deleteSession(id); }
});
