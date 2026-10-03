import { integer, invalidResponse, object, requireInput, supabaseRpc, type HostedRpc } from './rpc';

export interface ExportRetentionOptions { apply: boolean; limit: number; days: number }
const counts = ['sessions', 'exports', 'scoreReceipts', 'deferred'] as const;
export type ExportRetentionReport = Record<typeof counts[number], number> & { kind: 'preview' | 'applied' };

/** One operator-authorized batch; private snapshots never enter the response. */
export async function retainHostedExports(options: ExportRetentionOptions, rpc: HostedRpc = supabaseRpc): Promise<ExportRetentionReport> {
  requireInput(typeof options.apply === 'boolean' && integer(options.limit, 1) && options.limit <= 100
    && integer(options.days, 1) && options.days <= 3650);
  const data = await rpc('interrogation_export_retention_batch', {
    p_apply: options.apply, p_limit: options.limit, p_days: options.days,
  });
  const expected = options.apply ? 'applied' : 'preview';
  if (!object(data) || data.kind !== expected
    || !counts.every(key => integer(data[key]) && data[key] <= options.limit)) return invalidResponse();
  return Object.fromEntries([['kind', expected], ...counts.map(key => [key, data[key]])]) as ExportRetentionReport;
}
