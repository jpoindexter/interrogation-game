import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chooseApproach, EMPTY_DRAFT, prepareDraftAction, validateDraft } from '../app/game/playbook/composer';
import { contextualStarter } from '../app/game/playbook/DraftStarter';
import { nextDraftStep } from '../app/game/playbook/WorkbenchProgress';
import SourcePicker from '../app/game/playbook/SourcePicker';
import ExhibitPicker from '../app/game/playbook/ExhibitPicker';
import DialogueApproaches from '../app/game/playbook/DialogueApproaches';
import SourceTurn from '../app/game/playbook/SourceTurn';
import type { PublicGameplayProjection } from '../app/game/playbook/types';

const statement = { id: 'statement-public', turnId: 'turn-public', quote: 'I left at six.' };
const projection: PublicGameplayProjection = {
  caseId: 'public-case', title: 'Test case', briefing: 'Public briefing.', status: 'active', establishedCount: 0,
  turns: [{ id: statement.turnId, question: 'When did you leave?', answer: statement.quote, timestamp: 1 }],
  statements: [statement], exhibits: [{ id: 'log-public', title: 'Visitor log', kind: 'document', text: 'A disclosed log entry.' }],
};
const noop = () => {};

test('approaches create distinct editable drafts while retaining selected evidence', () => {
  const base = { ...EMPTY_DRAFT, exhibitId: 'log-public' };
  const drafts = ['clarify', 'present_evidence', 'leave_space'].map(kind => chooseApproach(base, kind as typeof base.kind, statement));
  assert.equal(new Set(drafts.map(draft => draft.question)).size, 3);
  drafts.forEach(draft => { assert.ok(draft.question.includes(statement.quote)); assert.equal(draft.exhibitId, 'log-public'); });
  assert.equal(base.question, '', 'choosing a suggestion must not mutate the prior draft');
  assert.equal(chooseApproach({ ...base, question: 'My edited question.' }, 'leave_space', statement).question, 'My edited question.');
  assert.match(contextualStarter('present_evidence', statement, projection.exhibits[0])!, /Visitor log/);
  assert.equal(contextualStarter('present_evidence', statement), null, 'evidence starters require a public exhibit');
});

test('submission retains edited prose, reuses an unchanged retry ID and changes ID for new intent', () => {
  let sequence = 0;
  const draft = { kind: 'present_evidence' as const, exhibitId: 'log-public', question: '  Explain this entry.  ' };
  const first = prepareDraftAction(draft, statement, null, () => `request-${++sequence}`);
  assert.equal(first.question, 'Explain this entry.');
  assert.equal(prepareDraftAction(draft, statement, first, () => assert.fail('retry minted a new ID')), first);
  assert.notEqual(prepareDraftAction({ ...draft, question: 'Who signed it?' }, statement, first, () => `request-${++sequence}`).id, first.id);
  const clarify = prepareDraftAction({ ...draft, kind: 'clarify' }, statement, first, () => 'new-clarify');
  assert.equal(clarify.exhibitId, undefined, 'non-evidence dialogue must not send a hidden exhibit reference');
});

test('only disclosed exhibits and current transcript sources can be challenged', () => {
  const draft = { kind: 'present_evidence' as const, exhibitId: 'log-public', question: 'Explain this.' };
  assert.equal(validateDraft(draft, statement, projection), null);
  assert.equal(nextDraftStep(draft, true, projection), null);
  assert.match(nextDraftStep({ ...draft, exhibitId: '' }, true, projection)!, /Choose an exhibit/);
  assert.match(nextDraftStep(draft, false, projection)!, /pin a suspect statement/);
  assert.match(validateDraft({ ...draft, exhibitId: 'hidden-exhibit' }, statement, projection)!, /available exhibit/);
  assert.match(validateDraft(draft, { ...statement, turnId: 'foreign-turn' }, projection)!, /no longer available/);
  assert.match(validateDraft(draft, { ...statement, quote: 'Invented words' }, projection)!, /no longer available/);
  assert.match(validateDraft(draft, statement, { ...projection, status: 'ended' })!, /ended/);
});

test('source pinning and exhibit controls have native labels and exact public content', () => {
  const source = renderToStaticMarkup(<SourcePicker turns={projection.turns} source={projection.turns[0]} pinned={statement}
    disabled={false} pending={false} onSelect={noop} onPin={noop} onUnpin={noop} onSource={noop} />);
  assert.match(source, /for="playbook-source"/);
  assert.match(source, /<select id="playbook-source"/);
  assert.match(source, /Pin exact statement/);
  assert.match(source, /I left at six\./);
  const exhibit = renderToStaticMarkup(<ExhibitPicker exhibits={projection.exhibits} selectedId="log-public" disabled={false} onSelect={noop} />);
  assert.match(exhibit, /for="playbook-exhibit"/);
  assert.match(exhibit, /A disclosed log entry\./);
  assert.doesNotMatch(exhibit, /hidden-exhibit/);
});

test('three approach buttons report selection and original source survives later turns', () => {
  const options = renderToStaticMarkup(<DialogueApproaches selected="clarify" disabled={false} onChoose={noop} />);
  assert.equal((options.match(/<button/g) || []).length, 3);
  assert.equal((options.match(/aria-pressed="true"/g) || []).length, 1);
  const turns = [...projection.turns, ...Array.from({ length: 10 }, (_, i) => ({ id: `later-${i}`, question: 'Later?', answer: 'Later answer', timestamp: i + 2 }))];
  const source = renderToStaticMarkup(<SourceTurn turn={turns.find(turn => turn.id === statement.turnId)} onClose={noop} />);
  assert.match(source, /data-source-turn="turn-public"/);
  assert.match(source, /I left at six\./);
  assert.doesNotMatch(source, /Later answer/);
});
