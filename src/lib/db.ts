import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

export function databaseConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return !!(env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL) && !!env.SUPABASE_SERVICE_ROLE_KEY;
}
function trustedDatabaseUrl(value: string): string {
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error('Server Supabase URL is invalid'); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('Server Supabase URL must be HTTPS without embedded credentials or query parameters');
  }
  return parsed.href;
}
export function databaseConfiguration(env: Record<string, string | undefined> = process.env) {
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Server Supabase URL and service role key are required');
  return { url: trustedDatabaseUrl(url), key };
}

let cached: { url: string; key: string; client: SupabaseClient } | undefined;

/** Database destinations and privileged credentials only come from trusted server configuration. */
export function getSupabaseClient(request?: NextRequest): SupabaseClient {
  void request; // Untrusted request headers cannot override the configured database.
  const { url, key } = databaseConfiguration();
  if (!cached || cached.url !== url || cached.key !== key) {
    cached = { url, key, client: createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, options) => fetch(input, { ...options,
        signal: options?.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000),
      }) },
    }) };
  }
  return cached.client;
}

// Existing export call sites can resolve the configured client lazily, without placeholder network traffic.
const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const client = getSupabaseClient();
    const value = Reflect.get(client, property);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
export default supabase;
