import assert from 'node:assert/strict';
import test from 'node:test';
import { createGameClock } from '../app/game/state/game-clock';

void test('briefing time is excluded; elapsed wall time includes provider/audio delays', () => {
  let now = 0;
  const clock = createGameClock({ limit: 300, unlimited: false, now: () => now });
  now = 90_000;
  clock.tick();
  assert.equal(clock.getSnapshot(), 0);
  clock.start();
  now += 15_500;
  clock.tick();
  assert.equal(clock.getSnapshot(), 15);
  assert.equal(clock.remaining(clock.getSnapshot()), 285);
  clock.start();
  now += 10_000;
  clock.tick();
  assert.equal(clock.getSnapshot(), 25, 'resuming processing must not reset the clock');
});

void test('expiry uses latest callback and fires only once after a delayed tick', () => {
  let now = 1000;
  let oldCalls = 0;
  let latestCalls = 0;
  const clock = createGameClock({ limit: 5, unlimited: false, now: () => now });
  clock.onExpire(() => oldCalls++);
  clock.start();
  clock.onExpire(() => latestCalls++);
  now += 9000;
  clock.tick();
  clock.tick();
  assert.equal(oldCalls, 0);
  assert.equal(latestCalls, 1);
  assert.equal(clock.remaining(clock.getSnapshot()), 0);
});

void test('unlimited mode counts up without expiry; server timestamp corrects drift', () => {
  let now = 1000;
  let expiries = 0;
  const clock = createGameClock({ limit: 0, unlimited: true, now: () => now });
  clock.onExpire(() => expiries++);
  clock.start();
  now = 3_601_000;
  clock.tick();
  assert.equal(clock.getSnapshot(), 3600);
  assert.equal(expiries, 0);
  clock.synchronize(now - 20_000);
  assert.equal(clock.getSnapshot(), 20);
});

void test('synchronizing an expired restored game before callback registration still delivers expiry once', () => {
  let now = 20_000;
  let calls = 0;
  const clock = createGameClock({ limit: 5, unlimited: false, now: () => now });
  clock.synchronize(1000);
  assert.equal(clock.getSnapshot(), 19);
  clock.onExpire(() => calls++);
  assert.equal(calls, 1);
  now += 5000;
  clock.tick();
  assert.equal(calls, 1);
});

void test('terminal/loading restore updates elapsed time without triggering a new timeout ending', () => {
  let calls = 0;
  const clock = createGameClock({ limit: 5, unlimited: false, active: false, now: () => 20_000 });
  clock.synchronize(1000);
  clock.onExpire(() => calls++);
  assert.equal(clock.getSnapshot(), 19);
  assert.equal(calls, 0);
  clock.setActive(true);
  assert.equal(calls, 1);
});

void test('callback replacement and cleanup retain the newest handler at an overdue deadline', () => {
  let now = 1000;
  let oldCalls = 0, latestCalls = 0;
  const clock = createGameClock({ limit: 5, unlimited: false, now: () => now });
  const removeOld = clock.onExpire(() => oldCalls++);
  clock.start();
  clock.onExpire(() => latestCalls++);
  removeOld();
  now = 8000;
  clock.tick();
  assert.equal(oldCalls, 0);
  assert.equal(latestCalls, 1);
});

void test('server correction after an early local timeout permits the later authoritative deadline', () => {
  let now = 10_000, calls = 0;
  const clock = createGameClock({ limit: 5, unlimited: false, now: () => now });
  clock.onExpire(() => calls++);
  clock.synchronize(1000);
  assert.equal(calls, 1);
  clock.synchronize(9000);
  assert.equal(clock.remaining(clock.getSnapshot()), 4);
  now = 14_000;
  clock.tick();
  assert.equal(calls, 2);
});

void test('invalid anchors cannot turn briefing into an epoch-based timeout', () => {
  let calls = 0;
  const clock = createGameClock({ limit: 300, unlimited: false, now: () => Date.now() });
  clock.onExpire(() => calls++);
  for (const anchor of [0, -1, NaN, Infinity]) clock.synchronize(anchor);
  clock.tick();
  assert.equal(clock.getSnapshot(), 0);
  assert.equal(calls, 0);
});
