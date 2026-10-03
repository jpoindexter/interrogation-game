import { databaseConfiguration } from './database';
import { AI_WORK_LIMITS } from '../limits/ai-policy';
import type { WorkReservation } from '../storage/hosted/budget';

type Environment = Record<string, string | undefined>;
export interface HostedConfiguration { deployment: string; policy: WorkReservation['policy'] }

function requireSetting(valid: unknown, name: string): asserts valid {
  if (!valid) throw new Error(`Hosted text requires valid server configuration: ${name}.`);
}
function limit(env: Environment, name: string, max: number, min = 0): number {
  const raw = env[name];
  requireSetting(typeof raw === 'string' && /^\d+$/.test(raw), name);
  const value = Number(raw);
  requireSetting(Number.isSafeInteger(value) && value >= min && value <= max, name);
  return value;
}
function credentialsConfigured(env: Environment): void {
  requireSetting(Boolean(env.OPENAI_API_KEY) && /^\S+$/.test(env.OPENAI_API_KEY!), 'OPENAI_API_KEY');
  requireSetting(Boolean(env.SUPABASE_SERVICE_ROLE_KEY) && /^\S+$/.test(env.SUPABASE_SERVICE_ROLE_KEY!), 'SUPABASE_SERVICE_ROLE_KEY');
  try { databaseConfiguration(env); }
  catch { throw new Error('Hosted text requires a trusted server Supabase project URL and service role key.'); }
}

/** Configuration validation only: never probes credentials, migrations, policies or a provider. */
export function hostedConfiguration(env: Environment = process.env): HostedConfiguration {
  requireSetting(env.SESSION_STORAGE === 'supabase', 'SESSION_STORAGE=supabase');
  requireSetting(env.HOSTED_TEXT_ENABLED === 'true', 'HOSTED_TEXT_ENABLED=true');
  requireSetting(env.AI_PROVIDER === 'openai', 'AI_PROVIDER=openai');
  requireSetting(env.AI_RAG_ENABLED === undefined || env.AI_RAG_ENABLED === 'false', 'AI_RAG_ENABLED=false');
  requireSetting(env.LEADERBOARD_STORAGE === 'supabase', 'LEADERBOARD_STORAGE=supabase');
  requireSetting(env.EXPORT_STORAGE === 'supabase', 'EXPORT_STORAGE=supabase');
  credentialsConfigured(env);
  const deployment = env.HOSTED_DEPLOYMENT_ID;
  requireSetting(typeof deployment === 'string' && /^[A-Za-z0-9_.:-]{1,96}$/.test(deployment), 'HOSTED_DEPLOYMENT_ID');
  return { deployment, policy: {
    sessionCalls: AI_WORK_LIMITS.calls, sessionUnits: AI_WORK_LIMITS.inputCharacters,
    deploymentCalls: limit(env, 'HOSTED_AI_CALLS_PER_WINDOW', 1_000_000),
    deploymentUnits: limit(env, 'HOSTED_AI_CHARACTERS_PER_WINDOW', 1e12),
    windowSeconds: limit(env, 'HOSTED_AI_WINDOW_SECONDS', 86_400, 60),
  } };
}
