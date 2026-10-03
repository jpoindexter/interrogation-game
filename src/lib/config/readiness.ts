import { databaseConfigured } from './database';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readProviderObservation } from './provider-observations';
import { hostedConfiguration } from './hosted';
import { hostedVoiceConfiguration, HOSTED_RECORDING_BYTES } from './hosted-voice';

type Readiness = { provider: string; configured: boolean; status: 'unchecked' | 'missing'; detail: string };
function service(provider: string, configured: boolean, detail: string): Readiness {
  return { provider, configured, status: configured ? 'unchecked' : 'missing', detail };
}

function aiReadiness(hosted: boolean) {
  const selected = process.env.AI_PROVIDER ?? 'codex-local';
  const provider = ['codex-local', 'openai'].includes(selected) ? selected : 'unsupported';
  if (process.env.AI_WORK_ENABLED === 'false') return service(provider, false,
    'AI work is stopped by the operator (AI_WORK_ENABLED=false). Existing results remain readable.');
  if (provider === 'openai') return service(provider, Boolean(process.env.OPENAI_API_KEY?.trim()),
    'Uses a server-side OpenAI API key and separate API billing. This check does not call the model.');
  if (provider !== 'codex-local') return service(provider, false, 'AI_PROVIDER must be codex-local or openai.');
  return codexReadiness(hosted);
}

function codexReadiness(hosted: boolean) {
  const provider = 'codex-local';
  if (process.env.CODEX_BIN !== undefined) return service(provider, !hosted && !!process.env.CODEX_BIN.trim(), hosted
    ? 'Subscription-based Codex is available only in the local demo.'
    : process.env.CODEX_BIN.trim() ? 'A custom Codex executable is configured. Its installation, sign-in and model access have not been checked.'
      : 'The custom Codex executable setting is empty. Remove CODEX_BIN or configure an executable.');
  const executable = join(process.cwd(), 'node_modules', '.bin', 'codex');
  return service(provider, !hosted && existsSync(executable), hosted
    ? 'Subscription-based Codex is available only in the local demo.'
    : 'CLI installation is checked. This status request does not verify sign-in, quota, model access or a game turn.');
}

function storageReadiness(hosted: boolean) {
  if (process.env.SESSION_STORAGE === 'supabase') {
    try {
      hostedConfiguration();
      return service('supabase', true, 'Shared text storage is explicitly configured. This check does not verify database access, required migrations, policies, provider credentials or deployed gameplay.');
    } catch {
      return service('supabase', false, 'Shared text requires explicit opt-in, OpenAI and server database configuration, shared leaderboard/export storage, a deployment ID and bounded AI allowances. Retrieval and hosted voice are unavailable.');
    }
  }
  if (hosted || (process.env.SESSION_STORAGE !== undefined && process.env.SESSION_STORAGE !== 'local')) {
    return service('unavailable', false, 'Hosted text requires SESSION_STORAGE=supabase and complete explicit hosted configuration. Local session files cannot be used on Vercel.');
  }
  const selected = process.env.LEADERBOARD_STORAGE || 'local';
  const provider = ['local', 'supabase'].includes(selected) ? selected : 'unsupported';
  if (provider === 'local') return service(provider, true, 'Private session and leaderboard files on this machine.');
  const configured = provider === 'supabase' && databaseConfigured();
  return service(provider, configured, 'Server configuration only. Database reachability, migrations and policies have not been checked.');
}

function voiceReadiness(shared: boolean) {
  if (shared) {
    let configured = false;
    try { hostedVoiceConfiguration(); configured = true; } catch { /* Text remains available without voice configuration. */ }
    return { ...service('elevenlabs', configured, configured
      ? 'Shared voice is configured with private audio storage and usage limits. This check does not verify bucket privacy, credentials, microphone access or playback.'
      : 'Hosted voice requires explicit enablement, an ElevenLabs key, a private bucket and deployment voice allowances. Continue with text.'),
    maxRecordingBytes: HOSTED_RECORDING_BYTES, observation: configured ? readProviderObservation('voice') : null };
  }
  return { ...service('elevenlabs', Boolean(process.env.ELEVENLABS_API_KEY?.trim()),
    'Speech and transcription require this server’s ElevenLabs API key; a plugin account connection alone does not configure it. Credentials and playback are not checked here; text input remains available.'),
  maxRecordingBytes: 25 * 1024 * 1024, observation: readProviderObservation('voice') };
}

export function readReadiness() {
  const hosted = Boolean(process.env.VERCEL);
  const services = {
    ai: { ...aiReadiness(hosted), observation: readProviderObservation('ai') },
    voice: voiceReadiness(hosted || process.env.SESSION_STORAGE === 'supabase'),
    storage: { ...storageReadiness(hosted), observation: null },
  };
  return {
    mode: hosted ? 'hosted' : 'local',
    status: services.ai.configured && services.storage.configured ? 'configured' : 'configuration_required',
    services,
  };
}
