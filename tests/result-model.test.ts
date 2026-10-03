import assert from 'node:assert/strict';
import test from 'node:test';
import { recordResult } from '../app/game/result/history';
import { readGameResult } from '../app/game/result/validation';
import { computeBreakdown } from '../app/game/result/score-breakdown';
import { lossPresentation } from '../app/game/result/loss-presentation';
import { evaluation, result, resultStorage } from './result-fixtures';

void test('legacy gameResult remains readable while malformed saved content is rejected', () => {
  assert.deepEqual(readGameResult(JSON.stringify(result)), result);
  assert.equal(readGameResult('not json'), null);
  assert.equal(readGameResult('{"caseData":{}}'), null);
  assert.equal(readGameResult(JSON.stringify({ ...result, confession: { unexpected: true } })), null);
  assert.equal(readGameResult(JSON.stringify({ ...result, conversationHistory: ['invalid'] })), null);
});

void test('result refresh records exactly one history entry using canonical score and difficulty', () => {
  const storage = resultStorage();
  recordResult(result, evaluation, storage);
  recordResult(result, evaluation, storage);
  const entries = JSON.parse(storage.getItem('caseHistory')!);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].resultId, 'session-1');
  assert.equal(entries[0].score, 876);
  assert.equal(entries[0].difficulty, 'medium');
});

void test('score presentation uses authoritative total and clamps zero-question efficiency', () => {
  const breakdown = computeBreakdown({ ...evaluation.stats, questionsAsked: 0 });
  assert.equal(breakdown.finalScore, 876);
  assert.equal(breakdown.efficiencyMultiplier, 1.5);
});

void test('loss presentation uses canonical lawyer outcome over stale browser flags', () => {
  const presentation = lossPresentation({ ...result, timeUp: true }, { ...evaluation, outcome: 'lose_lawyer' });
  assert.equal(presentation.label, 'Lawyered up');
  assert.equal(presentation.artwork, '/clues/folder.png');
});
