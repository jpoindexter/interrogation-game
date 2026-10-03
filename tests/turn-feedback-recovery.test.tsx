import test from 'node:test';
import assert from 'node:assert/strict';
import React, { type Dispatch, type SetStateAction } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { recordingActions } from '../app/game/controller/useGameActions';
import { questionAction } from '../app/game/controller/question-action';
import { useGameFeedback } from '../app/game/controller/useGameFeedback';
import { SuspectResponse } from '../app/game/components/SuspectZone';
import QuestionForm, { submitQuestionDraft } from '../app/game/components/QuestionForm';
import AccuseConfirmDialog from '../app/game/components/AccuseConfirmDialog';
import { GameFeedback } from '../app/game/view/GameFeedback';
import type { ActionFeedback } from '../app/game/components/ActionNotice';
import type { GameController } from '../app/game/controller/useGameController';
import type { Case } from '../src/lib/game-state';
import { actionHarness, validTurn } from './action-response-harness';

const noop = () => {};
function feedbackHarness() {
  let notice: ActionFeedback | null = null;
  let feedback!: ReturnType<typeof useGameFeedback>;
  const sounds: string[] = [];
  function Probe() {
    feedback = useGameFeedback({ setToast: (value: ActionFeedback | null) => { notice = value; } } as Parameters<typeof useGameFeedback>[0],
      ((sound: string) => { sounds.push(sound); }) as Parameters<typeof useGameFeedback>[1]);
    return null;
  }
  renderToStaticMarkup(<Probe />);
  return { feedback, sounds, current: () => notice };
}
function renderFeedback(notice: ActionFeedback | null, extra: Partial<GameController> = {}) {
  return renderToStaticMarkup(<GameFeedback {...{ toast: notice, fadingOut: false, endGameError: null,
    dismissToast: noop, setShowTextInput: noop, showAccuseConfirm: false, showTextInput: false,
    ...extra } as unknown as GameController} />);
}

test('a delayed second response retains previous dialogue and exposes an independent polite status', () => {
  const props = { isListening: false, isSpeaking: false, lastTranscript: 'Second question?', lastResponse: 'Previous answer.',
    phase: 'processing', caseData: { suspect_name: 'Casey' } as Case };
  const markup = renderToStaticMarkup(<SuspectResponse {...props} />);
  assert.match(markup, /Previous answer\./);
  assert.match(markup, /Second question\?/);
  assert.match(markup, /role="status" aria-live="polite" aria-atomic="true"[^>]*>Preparing the suspect’s response…/);
  assert.doesNotMatch(renderToStaticMarkup(<SuspectResponse {...props} phase="active" />), /Preparing the suspect/);
  assert.doesNotMatch(renderToStaticMarkup(<SuspectResponse {...props} isSpeaking />), /Preparing the suspect/);
});

test('actual feedback hook preserves errors beyond four seconds and announces informational notices politely', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const h = feedbackHarness();
  h.feedback.showToast('The question could not be confirmed.', 'error', 'question');
  t.mock.timers.tick(60000);
  const error = renderFeedback(h.current());
  assert.match(error, /role="alert"/);
  assert.match(error, /Review question/);
  assert.match(error, /type="button"[^>]*>Dismiss message/);
  assert.deepEqual(h.sounds, ['error']);
  h.feedback.dismissToast();
  assert.equal(h.current(), null);
  h.feedback.showToast('Recording transcribed. Review before sending.', 'info', 'question');
  const info = renderFeedback(h.current());
  assert.match(info, /role="status"/);
  assert.doesNotMatch(info, /role="alert"/);
  assert.deepEqual(h.sounds, ['error'], 'informational notices do not play the error sound');
});

test('dictation enters editable review; malformed reply retains exact draft and actual error; explicit retry reuses ID', async t => {
  const h = actionHarness(t, { ...validTurn, clues: [null] }), notices = feedbackHarness();
  Object.assign(h.context.runtime, notices.feedback);
  let draft = 'Existing note', show = false, delivered!: (text: string) => void;
  const setDraft: Dispatch<SetStateAction<string>> = value => { draft = typeof value === 'function' ? value(draft) : value; };
  h.context.panels.setQuestionDraft = setDraft;
  h.context.panels.setShowTextInput = value => { show = typeof value === 'function' ? value(show) : value; };
  h.context.runtime.startRecording = async onTranscript => { delivered = onTranscript; };
  recordingActions(h.context).startListening();
  draft = 'Newer typed note';
  delivered('Where was the reciept?');
  assert.equal(show, true);
  assert.equal(draft, 'Newer typed note\n\nWhere was the reciept?');
  assert.equal(h.sent.length, 0, 'dictation never sends automatically');
  draft = draft.replace('reciept', 'receipt');
  const submitted = draft, send = questionAction(h.context);
  await submitQuestionDraft({ value: draft, disabled: false, setValue: setDraft, onSubmit: send });
  assert.equal(draft, submitted);
  assert.equal(h.sent[0].playerQuestion, submitted, 'only corrected text is sent');
  assert.equal(h.state.phase, 'active');
  assert.equal(notices.current()?.tone, 'error');
  const outside = renderFeedback(notices.current());
  assert.match(outside, /role="alert"/);
  assert.match(outside, /Invalid clue\./);
  const inside = renderToStaticMarkup(<QuestionForm value={draft} disabled={false} setValue={setDraft} onSubmit={send}
    playKeystroke={noop} feedback={notices.current()} onDismissFeedback={notices.feedback.dismissToast} />);
  assert.match(inside, /role="alert"/);
  assert.match(inside, /Newer typed note/);
  assert.match(inside, /Where was the receipt\?/);
  assert.match(inside, /Ask question/);
  assert.doesNotMatch(renderFeedback(notices.current(), { showTextInput: true }), /role="alert"/, 'no duplicate/floating notice over composer');
  h.replies.body = validTurn;
  await submitQuestionDraft({ value: draft, disabled: false, setValue: setDraft, onSubmit: send });
  assert.equal(h.sent.length, 2);
  assert.equal(h.sent[0].requestId, h.sent[1].requestId, 'unknown acceptance preserves the unchanged request ID');
  assert.equal(draft, '');
  assert.equal(notices.current(), null, 'accepted response dismisses the previous question error');
});

test('a newer draft is not erased when a previous question finishes', async t => {
  const h = actionHarness(t, validTurn);
  let draft = 'Submitted question';
  h.context.runtime.speakResponse = async ({ onDone }) => { draft = 'Newer edited question'; onDone(); return 'ended'; };
  await submitQuestionDraft({ value: draft, disabled: false,
    setValue: value => { draft = typeof value === 'function' ? value(draft) : value; }, onSubmit: questionAction(h.context) });
  assert.equal(draft, 'Newer edited question');
  assert.equal(h.sent.length, 1);
});

test('over-limit dictated text is retained for editing and cannot be submitted', async () => {
  const draft = 'a'.repeat(520);
  let sends = 0;
  const props = { value: draft, disabled: false, setValue: () => assert.fail('Draft must not be erased'),
    onSubmit: async () => { sends++; return true; }, playKeystroke: noop };
  const markup = renderToStaticMarkup(<QuestionForm {...props} />);
  assert.match(markup, /20 characters too long/);
  assert.match(markup, /Shorten it before sending; your text is kept/);
  assert.match(markup, /<button type="submit" disabled=""/);
  assert.ok(markup.includes(draft));
  await submitQuestionDraft(props);
  assert.equal(sends, 0);
});

test('accusation error remains reachable inside its native modal and is not duplicated outside', () => {
  const feedback: ActionFeedback = { message: 'Accusation could not be confirmed. Review and retry.', tone: 'error' };
  const markup = renderToStaticMarkup(<AccuseConfirmDialog show accuseText="Preserved accusation" accusationsLeft={3}
    onChange={noop} onSubmitText={noop} onVoice={noop} onCancel={noop} feedback={feedback} onDismissFeedback={noop} />);
  assert.match(markup, /<dialog[^>]*aria-label="Make an accusation"[\s\S]*role="alert"/);
  assert.match(markup, /Preserved accusation/);
  assert.match(markup, /Dismiss message/);
  assert.match(markup, /Submit accusation/);
  assert.doesNotMatch(renderFeedback(feedback, { showAccuseConfirm: true }), /role="alert"/);
});
