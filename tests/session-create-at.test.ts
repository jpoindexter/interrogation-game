import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import { generationFixture } from './generation-fixtures';
import { createSessionAt, getSession, persistSession, acquireSessionLock, releaseSessionLock } from '../src/lib/session/store';

const options = () => ({ sessionId: randomBytes(24).toString('hex'), caseData: { difficulty: 'easy', the_truth: 'Private fact' },
  learnedTactics: ['Evidence checking'], totalPriorGames: 3, timerMode: 'unlimited' as const });

test('materializing the same reserved ID retains accepted progress and creation time', async context => {
  await generationFixture(context);
  const input = options();
  assert.equal(createSessionAt(input), input.sessionId);
  const original = getSession(input.sessionId)!;
  original.conversationHistory.push({ role: 'user', kind: 'question', content: 'Where?' });
  original.questionsAsked = 1;
  original.accusationsLeft = 2;
  original.hintTexts = ['Review the timeline'];
  persistSession(input.sessionId);
  assert.equal(createSessionAt(input), input.sessionId);
  const recovered = getSession(input.sessionId)!;
  assert.equal(recovered.createdAt, original.createdAt);
  assert.equal(recovered.questionsAsked, 1);
  assert.equal(recovered.accusationsLeft, 2);
  assert.deepEqual(recovered.hintTexts, ['Review the timeline']);
  assert.equal(recovered.conversationHistory.length, 1);
});

test('reserved ID cannot be rebound to another case or materialized during a session action', async context => {
  await generationFixture(context);
  const input = options();
  createSessionAt(input);
  assert.throws(() => createSessionAt({ ...input, caseData: { difficulty: 'hard' } }), /different case data/);
  assert.equal(getSession(input.sessionId)!.caseData.the_truth, 'Private fact');
  assert.equal(acquireSessionLock(input.sessionId), true);
  try { assert.throws(() => createSessionAt(input), /busy/); }
  finally { releaseSessionLock(input.sessionId); }
  assert.equal(createSessionAt(input), input.sessionId);
});
