import test from 'node:test';
import assert from 'node:assert/strict';
import { questionAction } from '../app/game/controller/question-action';
import { accusationAction } from '../app/game/controller/accusation-action';
import { hintAction } from '../app/game/controller/hint-action';
import { actionHarness, validTurn, validAccusation } from './action-response-harness';
import { recordReleaseProgress } from '../src/lib/case-disclosure-policy';
import type { ConversationMessage } from '../src/lib/ai/types';

const DOMAIN_FIELDS = ['conversationHistory', 'clues', 'stressLevel', 'maxStress', 'gameplay', 'accusationsLeft', 'hintsUsed', 'hintTexts', 'lastResponse'];

test('malformed turn leaves progress untouched and retries the same saved receipt before acknowledgement', async t => {
  const h = actionHarness(t, { ...validTurn, clues: [{ id: 'one', text: 123 }] });
  const send = questionAction(h.context);
  assert.equal(await send('Keep this question'), false);
  assert.equal(h.state.lastTranscript, 'Keep this question');
  assert.equal(h.state.phase, 'active');
  assert.equal(h.mutations.some(field => DOMAIN_FIELDS.includes(field)), false);
  assert.equal(h.events.some(event => event.startsWith('timing:')), false);
  h.replies.body = validTurn;
  assert.equal(await send('Keep this question'), true);
  assert.equal(h.sent[0].requestId, h.sent[1].requestId);
  assert.deepEqual(h.state.clues, ['Visitor log']);
  assert.equal((h.state.conversationHistory as unknown[]).length, 2);
  await send('Keep this question');
  assert.notEqual(h.sent[1].requestId, h.sent[2].requestId);
});

test('invalid accusation count retains draft, attempts and history, then recovers one valid judgment', async t => {
  const h = actionHarness(t, { ...validAccusation, accusationsLeft: 7 });
  const submit = accusationAction(h.context);
  assert.equal(await submit('Preserve my accusation'), false);
  assert.equal(h.panels.accuseText, 'Preserve my accusation');
  assert.equal(h.state.accusationsLeft, 3);
  assert.equal(h.mutations.some(field => DOMAIN_FIELDS.includes(field)), false);
  assert.equal(h.events.some(event => event.startsWith('timing:')), false);
  h.replies.body = validAccusation;
  assert.equal(await submit('Preserve my accusation'), true);
  assert.equal(h.sent[0].requestId, h.sent[1].requestId);
  assert.equal(h.state.accusationsLeft, 2);
  assert.equal(h.panels.accuseText, '');
  const history = h.state.conversationHistory as ConversationMessage[];
  assert.equal(history[0].kind, 'accusation');
  assert.equal(recordReleaseProgress(history, 'easy').asked, 0, 'A rejected accusation must not advance case-record progress');
});

test('invalid hint cannot consume hints or append partial text; retry recovers same receipt', async t => {
  const h = actionHarness(t, { hint: 'Check the visitor log.', hintsUsed: 9, maxHints: 2 });
  const hint = hintAction(h.context);
  assert.equal(await hint(), false);
  assert.equal(h.state.hintsUsed, 0);
  assert.deepEqual(h.state.hintTexts, []);
  h.replies.body = { hint: 'Check the visitor log.', hintsUsed: 1, maxHints: 2 };
  assert.equal(await hint(), true);
  assert.equal(h.sent[0].requestId, h.sent[1].requestId);
  assert.equal(h.state.hintsUsed, 1);
  assert.deepEqual(h.state.hintTexts, ['Check the visitor log.']);
});

test('validated expired turn ends once without adding the unaccepted question', async t => {
  const h = actionHarness(t, { ...validTurn, timeExpired: true, outcome: 'lose_time', status: 'lost' });
  assert.equal(await questionAction(h.context)('Too late'), true);
  assert.deepEqual(h.events, ['timing:1000', 'time']);
  assert.deepEqual(h.state.conversationHistory, []);
  assert.equal(h.state.phase, 'processing');
});

test('final wrong accusation ends exactly once without an active-phase flicker', async t => {
  const h = actionHarness(t, { ...validAccusation, accusationsLeft: 0, outcome: 'lose_accusations', status: 'lost' });
  h.state.accusationsLeft = 1;
  assert.equal(await accusationAction(h.context)('A final incorrect claim'), true);
  assert.equal(h.state.accusationsLeft, 0);
  assert.equal(h.state.phase, 'processing');
  assert.equal(h.events.filter(event => event === 'lose').length, 1);
  assert.equal(h.events.indexOf('speech') < h.events.indexOf('lose'), true);
});

test('cancelled confession cannot trigger late handcuffs or win navigation', async t => {
  const h = actionHarness(t, { ...validAccusation, correct: true, outcome: 'win', status: 'won', winToken: 'fixture-token' });
  let finishSpeech!: (value: 'cancelled') => void;
  let startedSpeech!: () => void;
  const started = new Promise<void>(resolve => { startedSpeech = resolve; });
  h.context.runtime.speakConfession = () => {
    startedSpeech();
    return new Promise(resolve => { finishSpeech = resolve; });
  };
  const submission = accusationAction(h.context)('The supported contradiction');
  await started;
  assert.equal(h.events.some(event => event.startsWith('navigate:')), false);
  finishSpeech('cancelled');
  assert.equal(await submission, true);
  assert.equal(h.events.some(event => event.startsWith('navigate:')), false);
  assert.equal(h.events.includes('sfx:handcuff'), false);
  assert.equal(h.state.phase, 'processing');
});

test('cancelled final rejection does not start a delayed ending after exit', async t => {
  const h = actionHarness(t, { ...validAccusation, accusationsLeft: 0, outcome: 'lose_accusations', status: 'lost' });
  h.state.accusationsLeft = 1;
  h.playback.value = 'cancelled';
  await accusationAction(h.context)('The final wrong claim');
  assert.equal(h.events.includes('lose'), false);
  assert.equal(h.state.phase, 'processing');
});


test('an already terminal win response recovers the result without a fabricated conversation turn', async t => {
  const h = actionHarness(t, { ...validTurn, outcome: 'win', status: 'won' });
  assert.equal(await questionAction(h.context)('An obsolete question'), true);
  assert.deepEqual(h.state.conversationHistory, []);
  assert.ok(h.events.includes('navigate:/game/win?session=test-session'));
});

test('malformed expiry response cannot change timing or trigger an ending', async t => {
  const h = actionHarness(t, { ...validTurn, timeExpired: true, outcome: 'lose_time', status: 'lost', clues: [null] });
  assert.equal(await questionAction(h.context)('Preserve this question'), false);
  assert.equal(h.events.some(event => event === 'time' || event.startsWith('timing:')), false);
  assert.deepEqual(h.state.conversationHistory, []);
  assert.equal(h.state.lastTranscript, 'Preserve this question');
});
