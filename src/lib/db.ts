import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
);

export default supabase;

/** Get a Supabase client — uses user-provided keys from headers if present, otherwise the default. */
export function getSupabaseClient(req?: NextRequest): SupabaseClient {
  if (!req) return supabase;
  const url = req.headers.get('x-supabase-url');
  const key = req.headers.get('x-supabase-anon-key');
  if (url && key) return createClient(url, key);
  return supabase;
}
