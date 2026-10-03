import { supabaseRpc, integer, invalidResponse, object, type HostedRpc } from '../../storage/hosted/rpc';
import { validExportKey, type ExportKey } from './cursor';
import type { ExportQuery } from './query';

export const EXPORT_PAGE_BYTES = 1024 * 1024;
export class OversizedExportError extends Error {
  constructor(readonly bytes: number) { super('A single game export exceeds the download page limit.'); }
}
export interface ExportPage { body: string; count: number; next?: ExportKey }
export function exportLine(row: unknown): string { return `${JSON.stringify(row)}\n`; }

function parameters(query: ExportQuery, after?: ExportKey) {
  return { p_limit: query.limit, p_offset: query.offset, p_max_bytes: EXPORT_PAGE_BYTES,
    p_outcome: query.outcome ?? null, p_difficulty: query.difficulty ?? null,
    p_setting: query.setting ?? null, p_after_at: after?.createdAt ?? null, p_after_id: after?.id ?? null };
}
function parsePage(data: unknown, limit: number): ExportPage {
  if (!object(data)) return invalidResponse();
  if (data.kind === 'oversized' && integer(data.bytes, 1)) throw new OversizedExportError(data.bytes);
  if (data.kind !== 'page' || !Array.isArray(data.rows) || data.rows.length > limit
    || !data.rows.every(object)) return invalidResponse();
  return formatPage(data.rows, data.next);
}
function formatPage(rows: Record<string, unknown>[], next: unknown): ExportPage {
  if (next !== null && !validExportKey(next, 'supabase')) return invalidResponse();
  const body = rows.map(exportLine).join('');
  if (Buffer.byteLength(body) > EXPORT_PAGE_BYTES || (next !== null && rows.length === 0)) return invalidResponse();
  return { body, count: rows.length, ...(next !== null ? { next: next as ExportKey } : {}) };
}
/** SQL bounds payload before transport; this second bound validates the final HTTP bytes. */
export async function readRemoteExportPage(query: ExportQuery, after?: ExportKey, rpc: HostedRpc = supabaseRpc): Promise<ExportPage> {
  return parsePage(await rpc('interrogation_export_page', parameters(query, after)), query.limit);
}
