import { resolve } from 'node:path';
import { databaseConfigured, getSupabaseClient } from '../db';
import { LocalLeaderboardStore } from './local-store';
import { SupabaseLeaderboardStore } from './supabase-store';
import type { LeaderboardStore } from './types';

export function leaderboardStorageMode(env: Record<string, string | undefined> = process.env): 'local' | 'supabase' {
  const mode = env.LEADERBOARD_STORAGE || (env.VERCEL ? '' : 'local');
  if (!['local', 'supabase'].includes(mode)) throw new Error('Set LEADERBOARD_STORAGE=supabase for hosted deployments');
  if (env.VERCEL && mode === 'local') throw new Error('Local leaderboard storage is not supported on Vercel');
  if (mode === 'supabase' && !databaseConfigured(env)) throw new Error('Supabase leaderboard configuration is incomplete');
  return mode as 'local' | 'supabase';
}
export function getLeaderboardStore(): LeaderboardStore {
  return leaderboardStorageMode() === 'supabase'
    ? new SupabaseLeaderboardStore(getSupabaseClient())
    : new LocalLeaderboardStore(resolve(process.env.INTERROGATION_DATA_DIR || '.local', 'leaderboard'));
}
