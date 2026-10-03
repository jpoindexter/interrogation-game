import { randomUUID } from 'node:crypto';
import { integer, invalidResponse, object, requireInput, supabaseRpc, type HostedRpc } from './rpc';

export interface AudioDeletionJob { id: string; bucket: string; objectKey: string; fence: number; leaseUntil: number; owner: string }
const uuid = (value: unknown): value is string => typeof value === 'string'
  && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
function limitInput(limit: number): void { requireInput(integer(limit, 1) && limit <= 100); }
function boundedCount(value: unknown, limit: number): number {
  if (!integer(value) || value > limit) return invalidResponse();
  return value;
}
function job(value: unknown, owner: string): AudioDeletionJob {
  if (!object(value) || !uuid(value.id) || typeof value.bucket !== 'string' || !/^[a-z0-9][a-z0-9-]{2,62}$/.test(value.bucket)
    || typeof value.objectKey !== 'string' || !/^[a-f0-9]{64}\/tts\/[a-f0-9]{64}\.mp3$/.test(value.objectKey)
    || !integer(value.fence, 1) || !integer(value.leaseUntil, 1)) return invalidResponse();
  return { id: value.id, bucket: value.bucket, objectKey: value.objectKey,
    fence: value.fence, leaseUntil: value.leaseUntil, owner };
}

/** Private operator RPCs. Returned identities stay inside the worker, never in CLI output. */
export class HostedAudioRetention {
  constructor(private readonly rpc: HostedRpc = supabaseRpc) {}

  async preview(limit: number): Promise<{ eligible: number; deferred: number }> {
    limitInput(limit);
    const result = await this.rpc('interrogation_audio_retention_preview', { p_limit: limit });
    if (!object(result) || result.kind !== 'preview') return invalidResponse();
    return { eligible: boundedCount(result.eligible, limit), deferred: boundedCount(result.deferred, limit) };
  }

  async claim(limit: number): Promise<{ jobs: AudioDeletionJob[]; deferred: number }> {
    limitInput(limit);
    const owner = randomUUID();
    const result = await this.rpc('interrogation_audio_retention_claim', { p_owner: owner, p_limit: limit });
    if (!object(result) || result.kind !== 'claimed' || !Array.isArray(result.jobs) || result.jobs.length > limit) return invalidResponse();
    const jobs = result.jobs.map(value => job(value, owner));
    if (new Set(jobs.map(value => value.id)).size !== jobs.length) return invalidResponse();
    return { jobs, deferred: boundedCount(result.deferred, limit) };
  }

  async finish(value: AudioDeletionJob): Promise<boolean> {
    requireInput(uuid(value.id) && uuid(value.owner) && integer(value.fence, 1));
    const result = await this.rpc('interrogation_audio_retention_finish', { p_job_id: value.id, p_owner: value.owner, p_fence: value.fence });
    if (!object(result) || !['deleted', 'replay', 'stale', 'invalid'].includes(String(result.kind))) return invalidResponse();
    return result.kind === 'deleted' || result.kind === 'replay';
  }
}
