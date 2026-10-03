import assert from 'node:assert/strict';
import { test } from 'node:test';
import { accusationAction } from '../app/game/controller/accusation-action';
import type { GameActionsContext } from '../app/game/controller/action-types';
import { snapshotToGameResult } from '../app/game/result/recover-result';
import type { SessionSnapshot } from '../app/game/state/session-recovery';
import { result, evaluation } from './result-fixtures';

test('a confirmed win still navigates to server recovery when browser storage is full', async () => {
  const old = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: { setItem() { throw new Error('Quota exceeded'); } } });
  const navigation: string[] = [];
  const phases: string[] = [];
  const id = 'a'.repeat(48);
  const noop = () => {};
  const context = {
    state: { caseData: { sessionId: id, suspect_name: 'Casey' }, stressLevel: 1, clues: ['record'], hintsUsed: 0, accusationsLeft: 3,
      conversationHistory: [], setIsAccusing: noop, setLastTranscript: noop, setPhase: (phase: string) => phases.push(phase),
      setAccusationsLeft: noop, setConversationHistory: noop, setLastResponse: noop },
    runtime: { elapsed: 5, timerRef: { current: null }, storePatterns: noop, sfx: noop, showToast: noop, synchronize: noop,
      router: { push: (path: string) => navigation.push(path) } },
    settings: { ttsEnabled: false }, panels: { setAccuseText: noop, setShowAccuseConfirm: noop }, difficulty: 'easy',
    request: async (_path: string, _body: unknown, parse: (value: unknown) => unknown) => parse({
      correct: true, confession: 'I returned later.', accusationsLeft: 2, winToken: 'b'.repeat(32),
      startedAt: 1000, status: 'won', outcome: 'win',
    }),
  } as unknown as GameActionsContext;
  try {
    assert.equal(await accusationAction(context)('The arrival record contradicts your denial.'), true);
    assert.deepEqual(navigation, [`/game/win?session=${id}`]);
    assert.deepEqual(phases, ['processing'], 'A committed win must not revert to playable state');
  } finally {
    if (old) Object.defineProperty(globalThis, 'sessionStorage', old);
    else Reflect.deleteProperty(globalThis, 'sessionStorage');
  }
});

test('URL result recovery derives the canonical outcome without reading browser storage', () => {
  const snapshot = { caseData: { ...result.caseData, sessionId: 'a'.repeat(48) },
    conversationHistory: [{ role: 'assistant', content: 'I returned later.' }],
    outcome: 'win', result: evaluation, winToken: 'b'.repeat(32), stressLevel: 2,
  } as unknown as SessionSnapshot;
  const recovered = snapshotToGameResult(snapshot, 'win');
  assert.equal(recovered.confession, 'I returned later.');
  assert.equal(recovered.timeElapsed, evaluation.stats.timeElapsed);
  assert.equal(recovered.winToken, 'b'.repeat(32));
  assert.throws(() => snapshotToGameResult(snapshot, 'lose'));
});
