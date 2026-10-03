import { databaseConfigured } from './database';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

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
  if (hosted || (process.env.SESSION_STORAGE && process.env.SESSION_STORAGE !== 'local')) {
    return service('unavailable', false, 'This build supports local session files only. Hosted or non-local session persistence is not implemented, even when leaderboard database settings are present.');
  }
  const selected = process.env.LEADERBOARD_STORAGE || 'local';
  const provider = ['local', 'supabase'].includes(selected) ? selected : 'unsupported';
  if (provider === 'local') return service(provider, !hosted, 'Private files on this machine. Hosted session persistence still requires a shared store.');
  const configured = provider === 'supabase' && databaseConfigured();
  return service(provider, configured, 'Server configuration only. Database reachability, migrations and policies have not been checked.');
}

export function readReadiness() {
  const hosted = Boolean(process.env.VERCEL);
  const services = {
    ai: aiReadiness(hosted),
    voice: service('elevenlabs', Boolean(process.env.ELEVENLABS_API_KEY?.trim()),
      'Speech and transcription require this server’s ElevenLabs API key; a plugin account connection alone does not configure it. Credentials and playback are not checked here; text input remains available.'),
    storage: storageReadiness(hosted),
  };
  return {
    mode: hosted ? 'hosted' : 'local',
    status: services.ai.configured && services.storage.configured ? 'configured' : 'configuration_required',
    services,
  };
}
