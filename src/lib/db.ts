import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

import { databaseConfiguration } from './config/database';
import { databaseFetch } from './config/database-fetch';
export { databaseConfigured, databaseConfiguration } from './config/database';

let cached: { url: string; key: string; client: SupabaseClient } | undefined;

/** Database destinations and privileged credentials only come from trusted server configuration. */
export function getSupabaseClient(request?: NextRequest): SupabaseClient {
  void request; // Untrusted request headers cannot override the configured database.
  const { url, key } = databaseConfiguration();
  if (!cached || cached.url !== url || cached.key !== key) {
    cached = { url, key, client: createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: databaseFetch(url) },
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
