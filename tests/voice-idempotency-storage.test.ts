import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { VoiceReceiptStore, voiceHash } from '../src/lib/voice/receipt-store';
import { MAX_RECEIPT_BYTES, MAX_VOICE_RECEIPTS, type VoiceReceipt } from '../src/lib/voice/receipt-types';
import { readVoiceBytes } from '../src/lib/voice/bounded-body';

function temporary(t: test.TestContext) {
  const directory = mkdtempSync(join(tmpdir(), 'voice-cache-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}
function pending(): VoiceReceipt {
  return { version: 1, state: 'pending', fingerprint: voiceHash('same input'), createdAt: Date.now(), reservedBytes: MAX_RECEIPT_BYTES };
}

test('in-flight audio reservations bound total cache size before another provider call starts', t => {
  const directory = temporary(t);
  for (let i = 0; i < 5; i++) assert.equal(new VoiceReceiptStore(directory, `request-${i}`).admit(pending()), true);
  assert.equal(new VoiceReceiptStore(directory, 'sixth-request').admit(pending()), false);
});

test('bounded receipt count and corrupt receipt both fail closed', t => {
  const directory = temporary(t);
  const receipt = { ...pending(), reservedBytes: 1000 };
  for (let i = 0; i < MAX_VOICE_RECEIPTS; i++) writeFileSync(join(directory, `${voiceHash(String(i))}.json`), JSON.stringify(receipt));
  assert.equal(new VoiceReceiptStore(directory, 'overflow').admit(receipt), false);
  const corrupt = new VoiceReceiptStore(directory, 'corrupt');
  writeFileSync(join(directory, `${voiceHash('corrupt')}.json`), '{bad');
  assert.throws(() => corrupt.load());
});

test('provider response body cannot exceed its limit or wait past the deadline after headers arrive', async () => {
  const oversized = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(11)); } });
  await assert.rejects(readVoiceBytes(oversized, 10, new AbortController().signal), /allowed size/);
  let cancelled = false;
  const stalled = new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } });
  const controller = new AbortController();
  const pendingRead = readVoiceBytes(stalled, 10, controller.signal);
  controller.abort(new DOMException('Deadline', 'TimeoutError'));
  await assert.rejects(pendingRead, /Deadline/);
  assert.equal(cancelled, true);
});
