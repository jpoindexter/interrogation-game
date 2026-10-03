import assert from 'node:assert/strict';
import test from 'node:test';
import { acceptLoadedCase } from '../app/game/controller/restore-game';
import type { SessionSnapshot } from '../app/game/state/session-recovery';
import { evaluation, resultStorage } from './result-fixtures';
import { readGameResult } from '../app/game/result/validation';

function recoveryFixture() {
  const calls: Array<[string, unknown]> = [];
  const record = (key: string) => (value: unknown) => { calls.push([key, value]); };
  const state = new Proxy({}, { get: (_, key) => record(String(key)) });
  const context = { state, panels: { setShowOnboarding: record('onboarding') },
    runtime: { router: { replace: record('route') }, sfx: record('sfx'), showToast: record('toast') },
    query: 'difficulty=medium', needsOnboarding: true } as unknown as Parameters<typeof acceptLoadedCase>[0];
  const snapshot = { caseData: { sessionId: 'recovered-session', case_number: '123', suspect_name: 'Ada',
    suspect_role: 'Technician', setting: 'Office', crime: 'Theft', difficulty: 'medium' },
    conversationHistory: [{ role: 'user', content: 'You changed the log.' }, { role: 'assistant', content: 'I did.' }],
    clues: [{ id: 'clue-1', text: 'Log mismatch' }], accusationsLeft: 1, hintsUsed: 1, hintTexts: ['Check the log'],
    stressLevel: 7, pendingRequests: [], status: 'won', outcome: 'win', result: evaluation,
    winToken: 'saved-token' } as unknown as SessionSnapshot;
  return { context, snapshot, calls };
}

test('terminal win recovery preserves canonical result, transcript and score token without activating timer', context => {
  const storage = resultStorage();
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage });
  context.after(() => { if (descriptor) Object.defineProperty(globalThis, 'sessionStorage', descriptor); else Reflect.deleteProperty(globalThis, 'sessionStorage'); });
  const fixture = recoveryFixture();
  acceptLoadedCase(fixture.context, fixture.snapshot.caseData, fixture.snapshot);
  const saved = readGameResult(storage.getItem('gameResult'))!;
  assert.equal(saved.winToken, 'saved-token');
  assert.equal(saved.timeElapsed, 123);
  assert.equal(saved.confession, 'I did.');
  assert.deepEqual(saved.conversationHistory, fixture.snapshot.conversationHistory);
  assert.deepEqual(JSON.parse(storage.getItem('evaluation:v1:recovered-session:win')!), evaluation);
  assert.ok(fixture.calls.some(([key, value]) => key === 'route' && value === '/game/win?session=recovered-session'));
  assert.ok(!fixture.calls.some(([key]) => key === 'setPhase'));
});

test('all loss causes recover their canonical flags and route without a new timeout', context => {
  const storage = resultStorage();
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage });
  context.after(() => { if (descriptor) Object.defineProperty(globalThis, 'sessionStorage', descriptor); else Reflect.deleteProperty(globalThis, 'sessionStorage'); });
  for (const outcome of ['lose_time', 'lose_giveup', 'lose_lawyer', 'lose_accusations']) {
    const fixture = recoveryFixture();
    Object.assign(fixture.snapshot, { outcome, status: 'lost', winToken: undefined,
      result: { ...evaluation, outcome, the_lie_revealed: 'Lie', the_truth_revealed: 'Truth', closest_moment: 'Clue', what_they_missed: 'Mismatch' } });
    acceptLoadedCase(fixture.context, fixture.snapshot.caseData, fixture.snapshot);
    const saved = readGameResult(storage.getItem('gameResult'))!;
    assert.equal(saved.timeUp, outcome === 'lose_time');
    assert.equal(saved.gaveUp, outcome === 'lose_giveup');
    assert.equal(saved.lawyeredUp, outcome === 'lose_lawyer');
    assert.ok(fixture.calls.some(([key, value]) => key === 'route' && value === '/game/lose?session=recovered-session'));
    assert.ok(!fixture.calls.some(([key]) => key === 'setPhase'));
  }
});

test('blocked browser storage still opens the canonical result recovery link', context => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: { setItem() { throw new Error('Blocked'); } } });
  context.after(() => { if (descriptor) Object.defineProperty(globalThis, 'sessionStorage', descriptor); else Reflect.deleteProperty(globalThis, 'sessionStorage'); });
  const fixture = recoveryFixture();
  assert.doesNotThrow(() => acceptLoadedCase(fixture.context, fixture.snapshot.caseData, fixture.snapshot));
  assert.ok(fixture.calls.some(([key, value]) => key === 'route' && value === '/game/win?session=recovered-session'));
  assert.ok(!fixture.calls.some(([key]) => key === 'setPhase'));
});
