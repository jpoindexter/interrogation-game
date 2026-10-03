import assert from 'node:assert/strict';
import test from 'node:test';
import { generationFixture } from './generation-fixtures';
import { createSession, getSession, getSessionRecord } from '../src/lib/session/store';
import { getSessionStats } from '../src/lib/session/stats';
import { issueWinToken } from '../src/lib/session/tokens';
import { allowsLawyerEscalation, resolvePlayMode, playModeRules, type PlayMode } from '../src/lib/session/play-mode';
import { computeBreakdown } from '../app/game/result/score-breakdown';
import { canRankResult, resultModePresentation } from '../app/game/result/mode-presentation';
import { validateEvaluation } from '../app/game/result/validation';
import { evaluation } from './result-fixtures';
import { leaderboardFixture } from './leaderboard-fixtures';
import { leaderboardPost } from '../src/lib/leaderboard/http';
import { redeemWin } from '../src/lib/leaderboard/redemption';

const modes: PlayMode[] = ['challenge', 'relaxed', 'endurance'];
const difficulties = ['easy', 'medium', 'hard', 'expert'] as const;

function completedSession(mode: PlayMode, difficulty: string, seconds: number) {
  const id = createSession({ playMode: mode, difficulty }, [], 0, playModeRules(mode).timerMode);
  const session = getSession(id)!;
  session.startTime = Date.now() - seconds * 1000;
  session.endedAt = session.startTime + seconds * 1000;
  session.outcome = 'win'; session.status = 'won'; session.accusationsUsed = 1; session.questionsAsked = 5;
  return id;
}

test('mode rules preserve difficulty and define explicit clock, lawyer, ranking behavior', () => {
  assert.equal(resolvePlayMode('countdown', undefined), 'challenge');
  assert.equal(resolvePlayMode('unlimited', undefined), 'relaxed');
  assert.equal(resolvePlayMode('unlimited', 'endurance'), 'endurance');
  for (const mode of modes) for (const difficulty of difficulties) {
    const rules = playModeRules(mode);
    assert.equal(rules.ranked, mode === 'challenge');
    assert.equal(rules.timerMode, mode === 'challenge' ? 'countdown' : 'unlimited');
    assert.equal(allowsLawyerEscalation(rules.timerMode, mode, difficulty),
      mode === 'endurance' && (difficulty === 'hard' || difficulty === 'expert'));
  }
  assert.equal(allowsLawyerEscalation('unlimited', undefined, 'expert'), false);
});

test('untimed score has no time penalty across all difficulties while actual duration is retained', async context => {
  await generationFixture(context);
  for (const mode of modes) for (const difficulty of difficulties) {
    const fast = getSessionStats(completedSession(mode, difficulty, 20))!;
    const slow = getSessionStats(completedSession(mode, difficulty, 180))!;
    assert.equal(fast.difficulty, difficulty);
    assert.equal(slow.timeElapsed, 180);
    assert.equal(slow.playMode, mode);
    assert.equal(slow.ranked, mode === 'challenge');
    if (mode === 'challenge') assert.ok(fast.score > slow.score);
    else assert.equal(fast.score, slow.score);
    const breakdown = computeBreakdown(slow);
    assert.equal(breakdown.mode.timeAffectsScore, mode === 'challenge');
    if (mode !== 'challenge') assert.equal(breakdown.timeScore, 1000);
    assert.equal(breakdown.finalScore, slow.score);
  }
});

test('only timed wins receive tokens and persist ranked mode in their canonical snapshot', async context => {
  await generationFixture(context);
  for (const mode of modes) {
    const id = completedSession(mode, 'medium', 90);
    const token = issueWinToken(id);
    assert.equal(Boolean(token), mode === 'challenge');
    const snapshot = getSessionRecord(id)!.token?.snapshot;
    if (snapshot) {
      assert.equal(snapshot.stats.ranked, true);
      assert.equal(snapshot.stats.playMode, 'challenge');
    }
  }
});

test('result labels preserve unknown legacy mode and untimed scoring instead of inferring ranked eligibility', () => {
  assert.equal(resultModePresentation(evaluation.stats).label, 'Mode not recorded');
  assert.equal(canRankResult(evaluation.stats), false);
  assert.equal(computeBreakdown(evaluation.stats).timeScore, null);
  for (const mode of modes) {
    const stats = { ...evaluation.stats, playMode: mode, ranked: mode === 'challenge' };
    assert.equal(canRankResult(stats), mode === 'challenge');
    assert.equal(resultModePresentation(stats).ranking, mode === 'challenge' ? 'Ranked challenge' : 'Unranked practice');
    assert.equal(validateEvaluation({ ...evaluation, stats }, 'win').stats.playMode, mode);
  }
  assert.throws(() => validateEvaluation({ ...evaluation, stats: { ...evaluation.stats, playMode: 'relaxed', ranked: true } }, 'win'), /play mode/);
});

test('leaderboard rejects unranked canonical snapshots even when client claims ranked challenge', async context => {
  const fixture = await leaderboardFixture(context);
  const snapshot = getSessionRecord(fixture.body.sessionId)!.token!.snapshot;
  snapshot.stats.playMode = 'relaxed'; snapshot.stats.ranked = false;
  const response = await leaderboardPost({ allowed: () => true, store: () => fixture.store,
    request: new Request('http://localhost/api/leaderboard', { method: 'POST',
      body: JSON.stringify({ ...fixture.body, ranked: true, playMode: 'challenge', score: 999999 }) }) });
  assert.equal(response.status, 401);
  assert.equal((await fixture.store.list()).length, 0);
  await assert.rejects(redeemWin(fixture.body, fixture.store, { inspect: () => snapshot, consume: () => true }), /Only timed challenge/);
});

test('ranked leaderboard excludes old rows without recorded mode and refuses their receipt replay', async context => {
  const fixture = await leaderboardFixture(context);
  await redeemWin(fixture.body, fixture.store);
  const saved = (await fixture.store.find(fixture.body.sessionId))!;
  assert.equal(saved.play_mode, 'challenge');
  assert.equal(saved.ranked, true);
  const legacy = { ...saved, session_id: 'b'.repeat(48), play_mode: undefined, ranked: undefined };
  await fixture.store.insert(legacy);
  assert.equal((await fixture.store.list()).length, 1);
  await assert.rejects(redeemWin({ ...fixture.body, sessionId: legacy.session_id }, fixture.store), /Only verified timed/);
});
