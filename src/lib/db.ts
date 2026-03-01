import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Default client — uses env vars if present, otherwise a no-op placeholder
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : createClient('https://placeholder.supabase.co', 'placeholder');

export default supabase;

/** Get a Supabase client — prefers user-provided keys from headers, falls back to env vars. */
export function getSupabaseClient(req?: NextRequest): SupabaseClient {
  if (req) {
    const url = req.headers.get('x-supabase-url');
    const key = req.headers.get('x-supabase-anon-key');
    if (url && key) return createClient(url, key);
  }
  return supabase;
}
