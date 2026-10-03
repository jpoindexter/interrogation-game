import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { accusationAction } from '../app/game/controller/accusation-action';
import { useGameFeedback } from '../app/game/controller/useGameFeedback';
import AccuseConfirmDialog from '../app/game/components/AccuseConfirmDialog';
import type { ActionFeedback } from '../app/game/components/ActionNotice';
import { actionHarness, validAccusation } from './action-response-harness';

const scenarios = [
  { name: 'HTTP 500', sameId: false, response: () => Response.json({ error: 'The accusation service failed. Review and retry.', code: 'ACTION_FAILED' }, { status: 500 }) },
  { name: 'HTTP 429', sameId: true, response: () => Response.json({ error: 'Too many requests. Wait and retry.', code: 'RATE_LIMITED' }, { status: 429 }) },
  { name: 'invalid JSON', sameId: true, response: () => new Response('{broken-json', { status: 200, headers: { 'Content-Type': 'application/json' } }) },
  { name: 'missing judgment fields', sameId: true, response: () => Response.json({ correct: false, confession: 'Incomplete judgment' }) },
  // The production session request ledger maps an unhandled AiError REFUSED to this
  // generic 502 envelope. This fixture exercises that client boundary, not a provider.
  { name: 'provider refusal envelope', sameId: false, response: () => Response.json({ error: 'This action could not be completed. Review the session and try a new attempt.', code: 'ACTION_FAILED' }, { status: 502 }) },
];
const protectedFields = ['accusationsLeft', 'conversationHistory', 'clues', 'clueRecords', 'stressLevel', 'maxStress',
  'hintsUsed', 'hintTexts', 'lastResponse', 'gameplay'];
const noop = () => {};

function feedbackHarness() {
  let notice: ActionFeedback | null = null;
  let feedback!: ReturnType<typeof useGameFeedback>;
  function Probe() {
    feedback = useGameFeedback({ setToast: (value: ActionFeedback | null) => { notice = value; } } as Parameters<typeof useGameFeedback>[0], noop);
    return null;
  }
  renderToStaticMarkup(<Probe />);
  return { feedback, current: () => notice };
}

for (const scenario of scenarios) test(`accusation ${scenario.name}: preserve state, render recovery, manually retry once`, async t => {
  const h = actionHarness(t, {}), notices = feedbackHarness();
  Object.assign(h.context.runtime, notices.feedback);
  h.state.conversationHistory = [{ role: 'assistant', content: 'Previously accepted account.', timestamp: 1 }];
  h.state.stressLevel = 4; h.state.maxStress = 6;
  h.state.clues = ['Earlier established fact']; h.state.clueRecords = [{ id: 'prior-clue', text: 'Earlier established fact' }];
  h.state.hintsUsed = 1; h.state.hintTexts = ['Earlier hint']; h.state.lastResponse = 'Previously accepted account.';
  h.state.gameplay = { establishedCount: 1 };
  const preserved = structuredClone(Object.fromEntries(protectedFields.map(field => [field, h.state[field]])));
  const text = h.panels.accuseText;
  let open = false, retry = false;
  h.context.panels.setShowAccuseConfirm = value => { open = typeof value === 'function' ? value(open) : value; };
  // Keep the real harness requestGameAction/parser/ledger, replacing only the HTTP boundary.
  t.mock.method(globalThis, 'fetch', async (_url: string, options: RequestInit) => {
    h.sent.push(JSON.parse(String(options.body)));
    return retry ? Response.json(validAccusation) : scenario.response();
  });
  const submit = accusationAction(h.context);
  assert.equal(await submit(text), false);
  assert.equal(open, true);
  assert.equal(h.panels.accuseText, text);
  assert.equal(h.state.phase, 'active');
  assert.equal(h.state.isAccusing, false);
  assert.deepEqual(Object.fromEntries(protectedFields.map(field => [field, h.state[field]])), preserved);
  assert.equal(h.events.some(event => event.startsWith('timing:') || event === 'speech' || event === 'lose'), false);
  assert.equal(h.sent.length, 1, 'failure never retries automatically');
  assert.equal(notices.current()?.tone, 'error');
  assert.ok(notices.current()?.message);
  if (scenario.name === 'invalid JSON') {
    assert.equal(notices.current()?.message, 'The server response could not be read. Your input is preserved; retry to recover the same action.');
  }
  const renderDialog = () => renderToStaticMarkup(<AccuseConfirmDialog show={open} accuseText={h.panels.accuseText}
    accusationsLeft={h.state.accusationsLeft as number} onChange={noop} onSubmitText={noop} onVoice={noop} onCancel={noop}
    feedback={notices.current()} onDismissFeedback={notices.feedback.dismissToast} />);
  const failed = renderDialog();
  assert.match(failed, /<dialog[^>]*aria-label="Make an accusation"[\s\S]*role="alert"/);
  assert.ok(failed.includes(text));
  assert.match(failed, /Dismiss message/);
  assert.match(failed, /Submit accusation/);
  if (scenario.name === 'invalid JSON') {
    assert.match(failed, /Your input is preserved; retry to recover the same action/);
    assert.doesNotMatch(failed, /SyntaxError|JSON at position|Expected property name/);
  }

  retry = true; open = false;
  assert.equal(await submit(text), true);
  assert.equal(h.sent.length, 2);
  assert.equal(h.sent[0].accusation, text); assert.equal(h.sent[1].accusation, text);
  assert.equal(h.sent[0].requestId === h.sent[1].requestId, scenario.sameId);
  assert.equal(h.state.accusationsLeft, 2, 'one accepted retry consumes exactly one attempt');
  assert.equal(h.panels.accuseText, '');
  assert.equal(h.state.phase, 'active');
  const history = h.state.conversationHistory as { content: string }[];
  assert.equal(history.length, 3);
  assert.deepEqual(history[0], (preserved.conversationHistory as unknown[])[0]);
  assert.equal(history[1].content, `[ACCUSATION] ${text}`);
  assert.equal(history[2].content, validAccusation.confession);
  for (const field of ['clues', 'clueRecords', 'stressLevel', 'maxStress', 'hintsUsed', 'hintTexts', 'gameplay']) {
    assert.deepEqual(h.state[field], preserved[field]);
  }
  assert.equal(h.events.filter(event => event === 'speech').length, 1);
  assert.equal(h.events.some(event => event === 'lose' || event.startsWith('navigate:')), false);
  t.diagnostic(`${scenario.name}: state/draft/dialog recovery and one valid retry executed; ${scenario.sameId ? 'unchanged uncertain ID retained' : 'known failed attempt gets a new ID'}`);
  assert.equal(notices.current(), null, 'a validated retry must dismiss the old error rather than leave it persistent');
  open = true;
  assert.doesNotMatch(renderDialog(), /role="alert"/);
});
