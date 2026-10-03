import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeCaseProgress } from '../app/cases/case-progress';

test('case progress recovers from malformed and wrong-shaped stored history', () => {
  assert.deepEqual(summarizeCaseProgress('{broken', '{}'), { solvedCases: [], stats: null });
  assert.deepEqual(summarizeCaseProgress('[null, 4, {}]', '["office", null, 7]'), {
    solvedCases: ['office'], stats: null,
  });
});

test('case progress counts only valid results and scores won cases', () => {
  const history = JSON.stringify([{ won: true, score: 200 }, { won: false, score: 900 }, { won: true }, { won: 'yes' }]);
  assert.deepEqual(summarizeCaseProgress(history, null).stats, {
    totalPlayed: 3, wins: 2, winRate: 67, bestScore: 200,
  });
});
