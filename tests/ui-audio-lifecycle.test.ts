import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioResource, type AudioClock } from '../app/hooks/audio-resource';
import { MusicEngine } from '../app/hooks/music-engine';

class FakeAudio extends EventTarget {
  src = 'test.mp3';
  volume = 0.5;
  paused = true;
  pauses = 0;
  loads = 0;
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; this.pauses++; }
  removeAttribute() { this.src = ''; }
  load() { this.loads++; }
}

function testClock() {
  let next = 0;
  const pending = new Map<number, () => void>();
  const clock: AudioClock = {
    schedule(callback) { pending.set(++next, callback); return next as unknown as ReturnType<typeof setTimeout>; },
    cancel(timer) { pending.delete(timer as unknown as number); },
  };
  const advance = () => {
    const entries = [...pending];
    pending.clear();
    entries.forEach(([, callback]) => callback());
  };
  return { clock, pending, advance };
}

test('disposing audio cancels fade/hold timers, detaches events and releases the source', () => {
  const audio = new FakeAudio();
  const timer = testClock();
  const resource = new AudioResource(audio as unknown as HTMLAudioElement, timer.clock);
  let ended = 0;
  resource.listen('ended', () => ended++);
  resource.fade(1, 1000);
  resource.schedule(() => assert.fail('disposed callback executed'), 2000);
  resource.dispose();
  timer.advance();
  audio.dispatchEvent(new Event('ended'));
  assert.equal(timer.pending.size, 0);
  assert.equal(ended, 0);
  assert.equal(audio.src, '');
  assert.equal(audio.loads, 1);
  resource.dispose();
  assert.equal(audio.loads, 1, 'disposal is idempotent');
});

test('direct volume changes invalidate an older fade target', () => {
  const audio = new FakeAudio();
  const timer = testClock();
  const resource = new AudioResource(audio as unknown as HTMLAudioElement, timer.clock);
  resource.fade(1, 1000);
  timer.advance();
  resource.setVolume(0.1);
  timer.advance();
  assert.equal(audio.volume, 0.1);
  assert.equal(timer.pending.size, 0);
  resource.dispose();
});

test('late playback resolution cannot revive a disposed audio resource', async () => {
  const audio = new FakeAudio();
  let resolve!: () => void;
  audio.play = () => new Promise<void>(done => { resolve = done; });
  const resource = new AudioResource(audio as unknown as HTMLAudioElement);
  const playing = resource.play();
  resource.dispose();
  resolve();
  assert.equal(await playing, false);
  assert.equal(audio.paused, true);
});

test('music disposal releases both sides of a transition and prevents later tracks', async () => {
  const audios: FakeAudio[] = [];
  const engine = new MusicEngine(() => {
    const audio = new FakeAudio();
    audios.push(audio);
    return audio as unknown as HTMLAudioElement;
  });
  engine.configure('menu', 0.2);
  await Promise.resolve();
  engine.configure('game', 0.2);
  engine.dispose();
  await Promise.resolve();
  for (const audio of audios) {
    assert.equal(audio.src, '');
    assert.equal(audio.paused, true);
    audio.dispatchEvent(new Event('ended'));
  }
  engine.configure('menu', 0.2);
  engine.resume();
  assert.equal(audios.length, 2);
});
