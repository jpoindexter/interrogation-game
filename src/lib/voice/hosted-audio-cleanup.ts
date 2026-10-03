import { HostedAudioRetention, type AudioDeletionJob } from '../storage/hosted/audio-retention';
import { eraseHostedAudio } from './hosted-object-erasure';

interface CleanupStores { receipts: HostedAudioRetention; erase: typeof eraseHostedAudio }
export interface AudioCleanupOptions { apply: boolean; limit: number }

async function removeJob(job: AudioDeletionJob, stores: CleanupStores, deadline: number): Promise<boolean> {
  // Leave time to record completion, and do not start work after a delayed claim.
  const remaining = Math.min(90_000, job.leaseUntil - Date.now() - 20_000, deadline - Date.now() - 20_000);
  if (remaining <= 0) return false;
  try {
    await stores.erase(job.bucket, job.objectKey, AbortSignal.timeout(remaining));
    return await stores.receipts.finish(job);
  } catch {
    // The object may be gone even if its acknowledgement was lost. Retain the
    // pending job so another explicit batch can verify absence after lease expiry.
    return false;
  }
}

/** Bounded operator invocation, no scheduler and no automatic retries. */
export async function cleanHostedAudio(options: AudioCleanupOptions,
  stores: CleanupStores = { receipts: new HostedAudioRetention(), erase: eraseHostedAudio }) {
  if (typeof options.apply !== 'boolean') throw new Error('Invalid cleanup mode.');
  if (!options.apply) return { kind: 'preview' as const, ...await stores.receipts.preview(options.limit) };
  const deadline = Date.now() + 120_000;
  const batch = await stores.receipts.claim(options.limit);
  let deleted = 0;
  for (const job of batch.jobs) {
    if (deadline - Date.now() <= 20_000) break;
    if (await removeJob(job, stores, deadline)) deleted++;
  }
  return { kind: 'applied' as const, claimed: batch.jobs.length, deleted,
    pending: batch.jobs.length - deleted, deferred: batch.deferred };
}
