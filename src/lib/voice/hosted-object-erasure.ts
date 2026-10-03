import { StorageApiError } from '@supabase/supabase-js';
import { getSupabaseClient } from '../db';
import { VoiceError } from './errors';

function storageFailure(): VoiceError {
  return new VoiceError('Saved audio is temporarily unavailable. Retry the same request.', 503, 'VOICE_STORAGE_UNAVAILABLE');
}

function validateTarget(bucket: string, objectKey: string): void {
  if (!/^[a-z0-9][a-z0-9-]{2,62}$/.test(bucket) || bucket.trim() !== bucket
    || objectKey.length !== 137 || !/^[a-f0-9]{64}\/tts\/[a-f0-9]{64}\.mp3$/.test(objectKey)) {
    throw storageFailure();
  }
}

async function isAbsent(bucket: string, objectKey: string, signal: AbortSignal): Promise<boolean> {
  signal.throwIfAborted();
  const { data, error } = await getSupabaseClient().storage.from(bucket).exists(objectKey);
  signal.throwIfAborted();
  // This SDK returns false WITH an error for both 400 and 404. Only 404 proves absence.
  if (data === false && error instanceof StorageApiError && error.status === 404) return true;
  if (error || data !== true) throw storageFailure();
  return false;
}

/** Observes exact-object absence now; it cannot prevent a later external recreation. */
export async function eraseHostedAudio(bucket: string, objectKey: string, signal: AbortSignal): Promise<void> {
  try {
    validateTarget(bucket, objectKey);
    signal.throwIfAborted();
    const { data, error } = await getSupabaseClient().storage.getBucket(bucket);
    signal.throwIfAborted();
    if (error || !data || data.id !== bucket || data.public !== false) throw storageFailure();
    if (await isAbsent(bucket, objectKey, signal)) return;
    signal.throwIfAborted();
    // remove() cannot take a signal. Await settlement under databaseFetch's 20s
    // request deadline; an uncertain response must be retried by the caller.
    const result = await getSupabaseClient().storage.from(bucket).remove([objectKey]);
    signal.throwIfAborted();
    if (result.error) throw storageFailure();
    if (!await isAbsent(bucket, objectKey, signal)) throw storageFailure();
  } catch {
    // Never export SDK messages, URLs, credentials, metadata, or abort reasons.
    throw storageFailure();
  }
}
