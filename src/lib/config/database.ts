type Environment = Record<string, string | undefined>;

/** This demo supports Supabase-managed project origins, including vanity subdomains. */
export function trustedDatabaseUrl(value: string): string {
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error('Server Supabase URL is invalid'); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('Server Supabase URL must be HTTPS without embedded credentials or query parameters');
  }
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.supabase\.co$/.test(parsed.hostname)
    || parsed.port || parsed.pathname !== '/') {
    throw new Error('Use an HTTPS Supabase project origin (https://<project>.supabase.co). Custom domains and self-hosted databases are unsupported in this demo.');
  }
  return parsed.origin;
}

export function databaseConfiguration(env: Environment = process.env) {
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Server Supabase URL and service role key are required');
  return { url: trustedDatabaseUrl(url), key };
}

export function databaseConfigured(env: Environment = process.env): boolean {
  try { databaseConfiguration(env); return true; } catch { return false; }
}
