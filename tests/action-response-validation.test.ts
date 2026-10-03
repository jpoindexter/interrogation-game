import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseAccusationResponse, parseHintResponse, parseTurnResponse } from '../app/game/controller/action-response-validation';
import { questionAction } from '../app/game/controller/question-action';
import { actionHarness, validTurn, validAccusation } from './action-response-harness';

const projection = { caseId: 'case', title: 'Ledger', briefing: 'Read the record', status: 'active',
  establishedCount: 0, turns: [], statements: [], exhibits: [] };

test('turn boundary rejects invalid numeric, boolean, list, lifecycle and public projection fields', () => {
  const malformed = [
    { stress_level: -1 }, { stress_level: 2.5 }, { stress_level: 11 }, { stress_level: Infinity }, { spoken_response: '  ' },
    { startedAt: NaN }, { startedAt: -1 }, { startedAt: '1000' }, { timeExpired: 'false' },
    { lawyered_up: 1 }, { caught: 'yes' }, { clues: null }, { clues: [{}] },
    { clues: [{ id: 'duplicate', text: 'One' }, { id: 'duplicate', text: 'Two' }] },
    { gameplay: {} }, { gameplay: { ...projection, establishedCount: -1 } },
    { timeExpired: true, lawyered_up: true }, { outcome: 'win', status: 'active' },
  ];
  for (const patch of malformed) assert.throws(() => parseTurnResponse({ ...validTurn, ...patch }));
  for (const value of [null, [], true, 123, 'response']) assert.throws(() => parseTurnResponse(value));
});

test('valid public projection is parsed and unknown response fields are excluded', () => {
  const result = parseTurnResponse({ ...validTurn, gameplay: projection, privateFixture: { secret: 'excluded' } });
  assert.equal(result.gameplay?.caseId, 'case');
  assert.equal('privateFixture' in result, false);
  assert.equal('status' in result, false);
});

test('judgment and hint counts must match a single accepted attempt, not just a finite number', () => {
  for (const accusationsLeft of [-1, 4, 1.5, Infinity, '2']) {
    assert.throws(() => parseAccusationResponse({ ...validAccusation, accusationsLeft }));
  }
  assert.throws(() => parseAccusationResponse(validAccusation, 2));
  assert.throws(() => parseAccusationResponse({ ...validAccusation, correct: 'false' }));
  assert.throws(() => parseAccusationResponse({ ...validAccusation, correct: true }));
  assert.throws(() => parseAccusationResponse({ ...validAccusation, gameplay: { ...projection, turns: [null] } }));
  assert.throws(() => parseHintResponse({ hint: 'Hint', hintsUsed: 2, maxHints: 2 }, 0));
  assert.throws(() => parseHintResponse({ hint: 'Hint', hintsUsed: 1, maxHints: 1.5 }));
  assert.throws(() => parseHintResponse({ hint: 4, hintsUsed: 1, maxHints: 2 }));
});

test('malformed positive JSON envelopes keep the retry identity and never mutate game progress', async t => {
  const h = actionHarness(t, null);
  const send = questionAction(h.context);
  for (const invalid of [null, [], 'text', 17, false]) {
    h.replies.body = invalid;
    assert.equal(await send('Original draft'), false);
  }
  assert.equal(new Set(h.sent.map(body => body.requestId)).size, 1);
  assert.deepEqual(h.state.conversationHistory, []);
  assert.deepEqual(h.state.clues, []);
  h.replies.body = validTurn;
  assert.equal(await send('Original draft'), true);
  assert.equal(h.sent[0].requestId, h.sent[5].requestId);
});

test('known failures allow a new attempt while uncertain storage errors retain their ID', async t => {
  const h = actionHarness(t, { error: 'Save uncertain', code: 'STORAGE_UNAVAILABLE' });
  const send = questionAction(h.context);
  h.replies.status = 503;
  await send('Same question');
  h.replies.body = { error: 'Still processing', code: 'ACTION_IN_PROGRESS' };
  h.replies.status = 409;
  await send('Same question');
  assert.equal(h.sent[0].requestId, h.sent[1].requestId);
  h.replies.body = { error: 'Known failure', code: 'ACTION_FAILED' };
  h.replies.status = 502;
  await send('Same question');
  h.replies.body = validTurn;
  h.replies.status = 200;
  await send('Same question');
  assert.notEqual(h.sent[2].requestId, h.sent[3].requestId);
});

test('cancelled receipt cannot acknowledge or change progress even when fetch resolves late', async t => {
  const h = actionHarness(t, validTurn);
  h.controller.abort();
  const send = questionAction(h.context);
  assert.equal(await send('Cancelled question'), false);
  h.state.phase = 'active'; // Re-entry restores the visible phase; the ambiguous request is still pending.
  assert.equal(await send('Cancelled question'), false);
  assert.equal(h.sent[0].requestId, h.sent[1].requestId);
  assert.deepEqual(h.state.conversationHistory, []);
  assert.equal(h.events.length, 0);
});


test('recorded HTTP judgment fields remain valid independently of the redacted gameplay links', () => {
  const evidence = JSON.parse(readFileSync('docs/audit/evidence/local-http-gameplay-map.json', 'utf8'));
  assert.equal(parseAccusationResponse({ ...evidence.result.win.wrongAccusation, gameplay: undefined }, 3).correct, false);
  assert.equal(parseAccusationResponse({ ...evidence.result.win.win, gameplay: undefined }, 2).correct, true);
});


test('malformed success followed by budget and rate denial retains the same recovery request ID', async t => {
  const h = actionHarness(t, { ...validTurn, clues: [null] });
  const send = questionAction(h.context);
  assert.equal(await send('Recover original turn'), false);
  for (const [status, code] of [[503, 'BUDGET_UNAVAILABLE'], [429, 'RATE_LIMITED'], [503, 'UNKNOWN_TEMPORARY']] as const) {
    h.replies.status = status;
    h.replies.body = { error: 'Temporarily unavailable', code };
    assert.equal(await send('Recover original turn'), false);
  }
  h.replies.status = 200;
  h.replies.body = validTurn;
  assert.equal(await send('Recover original turn'), true);
  assert.equal(new Set(h.sent.map(body => body.requestId)).size, 1);
  assert.equal((h.state.conversationHistory as unknown[]).length, 2);
});
