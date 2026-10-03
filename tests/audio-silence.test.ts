import assert from 'node:assert/strict';
import test from 'node:test';
import { detectSilence, type SilenceEnvironment } from '../app/game/audio/silence-detection';

function silenceFixture() {
  const evidence = { contextClosed: 0, sourceDisconnected: 0, analyserDisconnected: 0, cancelledFrames: 0, now: 0 };
  let frame: FrameRequestCallback | undefined;
  const context = {
    createMediaStreamSource: () => ({ connect() {}, disconnect() { evidence.sourceDisconnected++; } }),
    createAnalyser: () => ({ fftSize: 0, frequencyBinCount: 16,
      getByteFrequencyData(samples: Uint8Array) { samples.fill(0); },
      disconnect() { evidence.analyserDisconnected++; } }),
    async close() { evidence.contextClosed++; },
  } as unknown as AudioContext;
  const environment: SilenceEnvironment = {
    createContext: () => context,
    requestFrame: callback => { frame = callback; return 1; },
    cancelFrame: () => { evidence.cancelledFrames++; }, now: () => evidence.now,
  };
  return { evidence, environment, context, tick: (time: number) => { evidence.now = time; frame?.(time); } };
}

void test('manual analyser disposal closes AudioContext and all nodes exactly once', () => {
  const fixture = silenceFixture();
  let stops = 0;
  const dispose = detectSilence({} as MediaStream, () => stops++, fixture.environment);
  dispose();
  dispose();
  fixture.tick(3000);
  assert.equal(stops, 0);
  assert.equal(fixture.evidence.contextClosed, 1);
  assert.equal(fixture.evidence.sourceDisconnected, 1);
  assert.equal(fixture.evidence.analyserDisconnected, 1);
  assert.equal(fixture.evidence.cancelledFrames, 1);
});

void test('silence stops recording and closes monitoring resources', () => {
  const fixture = silenceFixture();
  let stops = 0;
  const dispose = detectSilence({} as MediaStream, () => stops++, fixture.environment);
  fixture.tick(1000);
  assert.equal(stops, 0);
  fixture.tick(2100);
  fixture.tick(4000);
  dispose();
  assert.equal(stops, 1);
  assert.equal(fixture.evidence.contextClosed, 1);
});

void test('AudioContext is closed when analyser initialization fails', () => {
  const fixture = silenceFixture();
  fixture.context.createAnalyser = () => { throw new Error('No analyser'); };
  assert.throws(() => detectSilence({} as MediaStream, () => {}, fixture.environment), /No analyser/);
  assert.equal(fixture.evidence.contextClosed, 1);
  assert.equal(fixture.evidence.sourceDisconnected, 1);
});
