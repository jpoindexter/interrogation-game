import { trustedDatabaseUrl } from './database';

function requestSignal(input: RequestInfo | URL, options?: RequestInit) {
  const source = options?.signal ?? (input instanceof Request ? input.signal : undefined);
  const timeout = AbortSignal.timeout(20_000);
  return source ? AbortSignal.any([source, timeout]) : timeout;
}

/** Keep privileged SDK traffic on its configured project and never follow redirects. */
export function databaseFetch(configuredUrl: string): typeof fetch {
  const origin = trustedDatabaseUrl(configuredUrl);
  return async (input, options) => {
    const target = new URL(input instanceof Request ? input.url : String(input));
    if (target.origin !== origin || target.username || target.password) {
      throw new Error('Database request destination does not match the configured Supabase project');
    }
    const response = await fetch(input, { ...options, redirect: 'error',
      signal: requestSignal(input, options) });
    if (response.status >= 300 && response.status < 400) throw new Error('Database redirects are not allowed');
    return response;
  };
}
