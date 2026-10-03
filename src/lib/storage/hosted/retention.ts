import { integer, invalidResponse, object, requireInput, supabaseRpc, type HostedRpc } from './rpc';

export const RETENTION_COUNTS = ['sessions', 'requests', 'generations', 'voices', 'exports',
  'exportsDeferred', 'sessionsDeferred', 'voicesDeferred'] as const;
export type RetentionReport = Record<typeof RETENTION_COUNTS[number], number> & { kind: 'preview' | 'applied' };
export interface RetentionOptions { apply: boolean; limit: number }

/** One bounded batch. No automatic retry after an uncertain destructive response. */
export async function retainHostedPayloads(options: RetentionOptions, rpc: HostedRpc = supabaseRpc): Promise<RetentionReport> {
  requireInput(typeof options.apply === 'boolean' && integer(options.limit, 1) && options.limit <= 100);
  const data = await rpc('interrogation_retention_batch', { p_apply: options.apply, p_limit: options.limit });
  const expected = options.apply ? 'applied' : 'preview';
  if (!object(data) || data.kind !== expected || !RETENTION_COUNTS.every(key => integer(data[key]))) return invalidResponse();
  // Project counts only: private fields from a malformed response must never reach CLI output.
  return Object.fromEntries([['kind', expected], ...RETENTION_COUNTS.map(key => [key, data[key]])]) as RetentionReport;
}
