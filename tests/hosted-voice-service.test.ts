import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HostedVoiceStorage } from '../src/lib/storage/hosted/voice';
import { voiceObjectKey, type HostedVoiceResponse } from '../src/lib/storage/hosted/voice-contracts';
import { runHostedVoice } from '../src/lib/voice/hosted-service';
import { HostedVoiceObjects, type HostedAudioObject, type SignedAudioDelivery } from '../src/lib/voice/hosted-objects';
import { VoiceError } from '../src/lib/voice/errors';

type Counts = { work: number; recover: number; save: number; sign: number; finish: number };
class ControlledObjects extends HostedVoiceObjects {
  constructor(private readonly counts: Counts, private readonly existing: HostedAudioObject | null) { super('fixture-voice'); }
  override async recover(key: string, signal: AbortSignal): Promise<HostedAudioObject | null> {
    this.counts.recover++; signal.throwIfAborted();
    if (this.existing) assert.equal(key, this.existing.objectKey);
    return this.existing;
  }
  override async save(): Promise<HostedAudioObject> {
    this.counts.save++;
    throw new Error('Recovery must never synthesize or upload audio');
  }
  override async sign(metadata: HostedAudioObject): Promise<SignedAudioDelivery> {
    this.counts.sign++;
    assert.deepEqual(metadata, { status: 200, contentType: 'audio/mpeg', ...this.existing });
    return { audioUrl: `https://fixture.supabase.co/storage/v1/object/sign/fixture-voice/${metadata.objectKey}?token=fixture-only`,
      expiresAt: Date.now() + 60_000, bytes: metadata.bytes, sha256: metadata.sha256 };
  }
}

function fixture(kind: 'claimed' | 'recover', expired: boolean, saved: boolean) {
  const counts: Counts = { work: 0, recover: 0, save: 0, sign: 0, finish: 0 };
  const identity = { sessionId: 'a'.repeat(48), requestId: 'voice-service-001', kind: 'tts' as const, bucket: 'fixture-voice',
    fingerprint: 'b'.repeat(64), revision: 0 };
  const metadata: HostedAudioObject = { objectKey: voiceObjectKey(identity), bytes: 3, sha256: 'c'.repeat(64) };
  const completed: HostedVoiceResponse[] = [];
  const receipts = new HostedVoiceStorage(async (name, parameters) => {
    if (name === 'interrogation_voice_claim_in_bucket') return { kind, fence: 2,
      leaseUntil: Date.now() + (expired ? -1 : 90_000), objectKey: metadata.objectKey };
    assert.equal(name, 'interrogation_voice_finish');
    counts.finish++;
    completed.push(parameters.p_response as HostedVoiceResponse);
    return { kind: 'committed', response: parameters.p_response };
  });
  const objects = new ControlledObjects(counts, saved ? metadata : null);
  const request: Parameters<typeof runHostedVoice>[0] = { ...identity, signal: new AbortController().signal,
    reservation: { deployment: 'fixture', units: 3, policy: {
      sessionCalls: 256, sessionUnits: 60000, deploymentCalls: 1000, deploymentUnits: 1000000, windowSeconds: 3600,
    } },
    work: async () => { counts.work++; return new Uint8Array([1, 2, 3]); },
  };
  return { counts, completed, metadata, run: () => runHostedVoice(request, { receipts, objects }) };
}

test('expired voice claim performs no provider, object or completion work', async () => {
  const state = fixture('claimed', true, false);
  await assert.rejects(state.run(), error => error instanceof VoiceError
    && error.status === 503 && error.code === 'VOICE_STORAGE_UNAVAILABLE');
  assert.deepEqual(state.counts, { work: 0, recover: 0, save: 0, sign: 0, finish: 0 });
  assert.deepEqual(state.completed, []);
});

test('missing saved audio records interruption without another provider call', async () => {
  const state = fixture('recover', false, false);
  const response = await state.run();
  assert.equal(response.status, 409);
  assert.equal(response.contentType, 'application/json');
  assert.equal(JSON.parse(response.body).code, 'VOICE_INTERRUPTED');
  assert.deepEqual(state.completed, [response]);
  assert.deepEqual(state.counts, { work: 0, recover: 1, save: 0, sign: 0, finish: 1 });
});

test('saved audio recovery completes metadata and signs delivery without provider work', async () => {
  const state = fixture('recover', false, true);
  const response = await state.run();
  assert.equal(response.status, 200);
  assert.equal(response.contentType, 'application/json');
  assert.deepEqual(state.completed, [{ status: 200, contentType: 'audio/mpeg', ...state.metadata }]);
  const delivery = JSON.parse(response.body);
  assert.equal(delivery.bytes, state.metadata.bytes);
  assert.equal(delivery.sha256, state.metadata.sha256);
  assert.ok(delivery.audioUrl.includes(state.metadata.objectKey));
  assert.deepEqual(state.counts, { work: 0, recover: 1, save: 0, sign: 1, finish: 1 });
});
