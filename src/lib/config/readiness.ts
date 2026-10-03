import { existsSync } from 'node:fs';
import { join } from 'node:path';

type Readiness = { provider: string; configured: boolean; status: 'unchecked' | 'missing'; detail: string };
function service(provider: string, configured: boolean, detail: string): Readiness {
  return { provider, configured, status: configured ? 'unchecked' : 'missing', detail };
}

function aiReadiness(hosted: boolean) {
  const provider = process.env.AI_PROVIDER || 'codex-local';
  if (process.env.AI_WORK_ENABLED === 'false') return service(provider, false,
    'AI work is stopped by the operator (AI_WORK_ENABLED=false). Existing results remain readable.');
  if (provider === 'openai') return service(provider, Boolean(process.env.OPENAI_API_KEY),
    'Uses a server-side OpenAI API key and separate API billing. This check does not call the model.');
  if (provider !== 'codex-local') return service(provider, false, 'AI_PROVIDER must be codex-local or openai.');
  if (process.env.CODEX_BIN) return service(provider, !hosted, hosted
    ? 'Subscription-based Codex is available only in the local demo.'
    : 'A custom Codex executable is configured. Its installation, sign-in and model access have not been checked.');
  const executable = join(process.cwd(), 'node_modules', '.bin', 'codex');
  return service(provider, !hosted && existsSync(executable), hosted
    ? 'Subscription-based Codex is available only in the local demo.'
    : 'CLI installation is checked. This status request does not verify sign-in, quota, model access or a game turn.');
}

function storageReadiness(hosted: boolean) {
  const provider = process.env.LEADERBOARD_STORAGE || 'local';
  if (provider === 'local') return service(provider, !hosted, 'Private files on this machine. Hosted session persistence still requires a shared store.');
  const configured = provider === 'supabase'
    && Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
    && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  return service(provider, configured, 'Server configuration only. Database reachability, migrations and policies have not been checked.');
}

export function readReadiness() {
  const hosted = process.env.VERCEL === '1';
  const services = {
    ai: aiReadiness(hosted),
    voice: service('elevenlabs', Boolean(process.env.ELEVENLABS_API_KEY),
      'Transcription and speech use server configuration. Credentials and playback are not checked here; text input remains available.'),
    storage: storageReadiness(hosted),
  };
  return {
    mode: hosted ? 'hosted' : 'local',
    status: services.ai.configured && services.storage.configured ? 'configured' : 'configuration_required',
    services,
  };
}
