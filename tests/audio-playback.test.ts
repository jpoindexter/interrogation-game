import assert from 'node:assert/strict';
import test from 'node:test';
import { deferred, flushAudio, speechFixture } from './audio-fixtures';

void test('normal playback releases audio and URL and calls completion once', async () => {
  const { player, audio, revoked } = speechFixture();
  let completed = 0;
  const outcome = player.play({ body: {}, volume: 0.5, onDone: () => completed++ });
  await flushAudio();
  const lateEnded = audio.onended;
  audio.end();
  lateEnded?.call(audio as unknown as HTMLMediaElement, new Event('ended'));
  assert.equal(await outcome, 'ended');
  assert.equal(completed, 1);
  assert.deepEqual(revoked, ['blob:0']);
  assert.equal(audio.pauses, 1);
});

void test('skip during audio download aborts and suppresses later audio and duplicate completion', async () => {
  const download = deferred<Blob>();
  let signal: AbortSignal | undefined;
  const { player, created, audio } = speechFixture((_body, abort) => { signal = abort; return download.promise; });
  let completed = 0;
  const outcome = player.play({ body: {}, volume: 1, onDone: () => completed++ });
  player.stop();
  assert.equal(await outcome, 'skipped');
  assert.equal(signal?.aborted, true);
  download.resolve(new Blob(['late audio']));
  await flushAudio();
  assert.equal(completed, 1);
  assert.equal(audio.plays, 0);
  assert.deepEqual(created, []);
});

void test('a new turn cancels an older download without firing its continuation', async () => {
  const old = deferred<Blob>();
  let calls = 0;
  const { player, audio, revoked } = speechFixture(() => ++calls === 1 ? old.promise : Promise.resolve(new Blob(['new'])));
  let oldDone = 0;
  const first = player.play({ body: {}, volume: 1, onDone: () => oldDone++ });
  const second = player.play({ body: {}, volume: 1 });
  assert.equal(await first, 'cancelled');
  await flushAudio();
  old.resolve(new Blob(['old']));
  await flushAudio();
  assert.equal(audio.plays, 1);
  assert.equal(oldDone, 0);
  audio.end();
  assert.equal(await second, 'ended');
  assert.deepEqual(revoked, ['blob:0']);
});

void test('autoplay rejection reports failure once and releases resources', async () => {
  const { player, audio, revoked } = speechFixture();
  audio.rejectPlay = true;
  let errors = 0;
  let completed = 0;
  const outcome = await player.play({ body: {}, volume: 1, onError: () => errors++, onDone: () => completed++ });
  assert.equal(outcome, 'failed');
  assert.equal(errors, 1);
  assert.equal(completed, 1);
  assert.deepEqual(revoked, ['blob:0']);
});

void test('navigation cancellation disposes playing audio without a game continuation', async () => {
  const { player, audio, revoked } = speechFixture();
  let completed = 0;
  const outcome = player.play({ body: {}, volume: 1, onDone: () => completed++ });
  await flushAudio();
  player.stop('cancelled');
  audio.end();
  assert.equal(await outcome, 'cancelled');
  assert.equal(completed, 0);
  assert.deepEqual(revoked, ['blob:0']);
  assert.equal(audio.onended, null);
});

void test('disabled voice and mute skip speech without fetching', async () => {
  let requests = 0;
  const { player } = speechFixture(async () => { requests++; return new Blob(); });
  assert.equal(await player.play({ body: {}, volume: 1, enabled: false }), 'skipped');
  assert.equal(await player.play({ body: {}, volume: 0 }), 'skipped');
  assert.equal(requests, 0);
});
