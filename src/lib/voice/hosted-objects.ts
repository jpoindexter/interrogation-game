import { createHash } from 'node:crypto';
import { databaseConfiguration, getSupabaseClient } from '../db';
import { readVoiceBytes } from './bounded-body';
import { VoiceError } from './errors';
import { MAX_AUDIO_BYTES } from './receipt-types';

export interface HostedAudioObject { objectKey: string; bytes: number; sha256: string }
export interface SignedAudioDelivery { audioUrl: string; expiresAt: number; bytes: number; sha256: string }

const OBJECT_KEY = /^[a-f0-9]{64}\/tts\/[a-f0-9]{64}\.mp3$/;
const SIGNED_SECONDS = 60;

function storageFailure(): VoiceError {
  return new VoiceError('Saved audio is temporarily unavailable. Retry the same request.', 503, 'VOICE_STORAGE_UNAVAILABLE');
}

function validateKey(objectKey: string): void {
  if (!OBJECT_KEY.test(objectKey)) throw storageFailure();
}

function describe(objectKey: string, audio: Uint8Array): HostedAudioObject {
  if (!audio.byteLength || audio.byteLength > MAX_AUDIO_BYTES) throw storageFailure();
  return { objectKey, bytes: audio.byteLength, sha256: createHash('sha256').update(audio).digest('hex') };
}

/** Bucket privacy is observed before every operation; this adapter never creates or publishes buckets. */
export class HostedVoiceObjects {
  constructor(private readonly bucket: string) {
    if (!/^[a-z0-9][a-z0-9-]{2,62}$/.test(bucket)) throw storageFailure();
  }

  async save(objectKey: string, audio: Uint8Array, signal: AbortSignal): Promise<HostedAudioObject> {
    validateKey(objectKey);
    signal.throwIfAborted();
    const metadata = describe(objectKey, audio);
    try {
      await this.requirePrivateBucket();
      signal.throwIfAborted();
      // upload() has no signal option. Await settlement under databaseFetch's deadline;
      // never detach an uncertain write or overwrite an earlier completed object.
      const { error } = await getSupabaseClient().storage.from(this.bucket).upload(objectKey, audio, {
        upsert: false, contentType: 'audio/mpeg', cacheControl: '0',
      });
      if (error) throw storageFailure();
      signal.throwIfAborted();
      return metadata;
    } catch { throw storageFailure(); }
  }

  async recover(objectKey: string, signal: AbortSignal): Promise<HostedAudioObject | null> {
    validateKey(objectKey);
    signal.throwIfAborted();
    try {
      await this.requirePrivateBucket();
      signal.throwIfAborted();
      const { data, error } = await getSupabaseClient().storage.from(this.bucket)
        .download(objectKey, {}, { signal }).asStream();
      if (error?.status === 404 || error?.statusCode === '404') return null;
      if (error || !data) throw storageFailure();
      return describe(objectKey, await readVoiceBytes(data, MAX_AUDIO_BYTES, signal));
    } catch { throw storageFailure(); }
  }

  async sign(metadata: HostedAudioObject): Promise<SignedAudioDelivery> {
    validateKey(metadata.objectKey);
    if (!Number.isSafeInteger(metadata.bytes) || metadata.bytes < 1 || metadata.bytes > MAX_AUDIO_BYTES
      || !/^[a-f0-9]{64}$/.test(metadata.sha256)) throw storageFailure();
    try {
      await this.requirePrivateBucket();
      const expiresAt = Date.now() + SIGNED_SECONDS * 1_000;
      const { data, error } = await getSupabaseClient().storage.from(this.bucket)
        .createSignedUrl(metadata.objectKey, SIGNED_SECONDS);
      if (error || !data) throw storageFailure();
      this.validateSignedUrl(data.signedUrl, metadata.objectKey);
      return { audioUrl: data.signedUrl, expiresAt, bytes: metadata.bytes, sha256: metadata.sha256 };
    } catch { throw storageFailure(); }
  }

  private async requirePrivateBucket(): Promise<void> {
    const { data, error } = await getSupabaseClient().storage.getBucket(this.bucket);
    if (error || !data || data.id !== this.bucket || data.public !== false) throw storageFailure();
  }

  private validateSignedUrl(value: string, objectKey: string): void {
    const url = new URL(value);
    const expectedPath = `/storage/v1/object/sign/${this.bucket}/${objectKey}`;
    if (url.origin !== databaseConfiguration().url || url.pathname !== expectedPath
      || url.username || url.password || url.hash || !url.searchParams.get('token')
      || [...url.searchParams.keys()].join(',') !== 'token') throw storageFailure();
  }
}
