import { hostedConfiguration } from './hosted';
import { VOICE_LIMITS } from '../limits/types';
import type { WorkReservation } from '../storage/hosted/budget';

export const HOSTED_RECORDING_BYTES = 3 * 1024 * 1024;
type Environment = Record<string, string | undefined>;
function count(env: Environment, name: string, maximum: number): number {
  const value = env[name];
  if (!value || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > maximum) {
    throw new Error(`Hosted voice requires an explicit bounded ${name}.`);
  }
  return Number(value);
}

/** Opt-in and work limits only; this does not verify a private bucket or provider key. */
export function hostedVoiceConfiguration(env: Environment = process.env) {
  const { deployment, policy: aiPolicy } = hostedConfiguration(env);
  if (env.HOSTED_VOICE_ENABLED !== 'true' || !env.ELEVENLABS_API_KEY || !/^\S+$/.test(env.ELEVENLABS_API_KEY)) {
    throw new Error('Hosted voice requires explicit enablement and a server ElevenLabs key.');
  }
  const bucket = env.HOSTED_VOICE_BUCKET;
  if (!bucket || !/^[a-z0-9][a-z0-9-]{2,62}$/.test(bucket)) throw new Error('A private hosted voice bucket is required.');
  const policy = (kind: 'tts' | 'stt'): WorkReservation['policy'] => ({
    sessionCalls: kind === 'tts' ? 256 : VOICE_LIMITS.recordings,
    sessionUnits: kind === 'tts' ? VOICE_LIMITS.speechCharacters : VOICE_LIMITS.recordings * HOSTED_RECORDING_BYTES,
    deploymentCalls: count(env, `HOSTED_${kind.toUpperCase()}_CALLS_PER_WINDOW`, 1_000_000),
    deploymentUnits: count(env, kind === 'tts' ? 'HOSTED_TTS_CHARACTERS_PER_WINDOW' : 'HOSTED_STT_BYTES_PER_WINDOW', 1e12),
    windowSeconds: aiPolicy.windowSeconds,
  });
  return { deployment, bucket, policies: { tts: policy('tts'), stt: policy('stt') } };
}
