import { createHash } from 'node:crypto';
import { AiError } from '../ai/contracts';
import { VoiceError } from '../voice/errors';
import { OBSERVATION_MAX_AGE_MS, type ProviderObservation, type ProviderOperation } from './observation-contract';

type Service = 'ai' | 'voice';
type Stored = { fingerprint: string; at: number; observation: Omit<ProviderObservation, 'stale'> };
const state = globalThis as typeof globalThis & { interrogationProviderObservations?: Map<Service, Stored> };
// Shared by route bundles in one process; intentionally not durable or shared across workers.
const observations = state.interrogationProviderObservations ??= new Map<Service, Stored>();
const commonKeys = ['VERCEL', 'AWS_LAMBDA_FUNCTION_NAME', 'SESSION_STORAGE'];
const configurationKeys = {
  ai: ['AI_PROVIDER', 'AI_WORK_ENABLED', 'OPENAI_API_KEY', 'OPENAI_MODEL', 'CODEX_BIN', 'CODEX_HOME',
    'CODEX_MODEL', 'CODEX_CASE_MODEL', 'AI_TIMEOUT_MS', 'HOME', 'PATH'],
  voice: ['ELEVENLABS_API_KEY', 'ELEVENLABS_TTS_MODEL', 'ELEVENLABS_STT_MODEL'],
};

function fingerprint(service: Service): string {
  const settings = [...commonKeys, ...configurationKeys[service]].map(key => [key, process.env[key] ?? null]);
  return createHash('sha256').update(JSON.stringify([process.cwd(), settings])).digest('hex');
}

export function readProviderObservation(service: Service, now = Date.now()): ProviderObservation | null {
  const stored = observations.get(service);
  if (!stored) return null;
  if (stored.fingerprint !== fingerprint(service)) { observations.delete(service); return null; }
  const age = now - stored.at;
  return { ...stored.observation, stale: age < 0 || age >= OBSERVATION_MAX_AGE_MS };
}

function failureStatus(error: unknown): ProviderObservation['status'] | null {
  if (error instanceof DOMException) return error.name === 'TimeoutError' ? 'unavailable' : error.name === 'AbortError' ? null : 'failed';
  if (!(error instanceof AiError || error instanceof VoiceError)) return 'failed';
  if (['CANCELLED', 'KEY_REQUIRED'].includes(error.code)) return null;
  const httpFailure = upstreamFailure(error.upstreamStatus);
  if (httpFailure) return httpFailure;
  return ['TIMEOUT', 'CODEX_UNAVAILABLE', 'NETWORK_UNAVAILABLE'].includes(error.code) ? 'unavailable' : 'failed';
}

function upstreamFailure(status?: number): ProviderObservation['status'] | null {
  if (status === 401) return 'authentication_failed';
  if (status === 429) return 'rate_limited';
  return status !== undefined && status >= 500 ? 'unavailable' : null;
}

function record(service: Service, config: string, operation: ProviderOperation, status: ProviderObservation['status'] | null) {
  if (!status || config !== fingerprint(service)) return;
  const at = Date.now();
  observations.set(service, { fingerprint: config, at, observation: { status, operation, observedAt: new Date(at).toISOString() } });
}

/** Invoke after local authorization/budgets. Work includes parsing/validation, not just HTTP headers. */
export async function observeProvider<T>(service: Service, operation: ProviderOperation, work: () => Promise<T>): Promise<T> {
  const config = fingerprint(service);
  try {
    const result = await work();
    record(service, config, operation, 'succeeded');
    return result;
  } catch (error) {
    record(service, config, operation, failureStatus(error));
    throw error;
  }
}
