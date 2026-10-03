import type { ExportOptions } from './options';

const PAGE_BYTES = 1024 * 1024;
async function boundedBody(response: Response): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader(), chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > PAGE_BYTES) throw new Error('Export page exceeded its byte limit; output preserved.');
      chunks.push(value);
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
  } catch { throw new Error('Export response was interrupted or exceeded its byte limit; output preserved.'); }
  finally { await reader.cancel().catch(() => undefined); }
}
function records(body: string): string[] {
  const lines = body.split('\n').filter(line => line.trim());
  for (const line of lines) {
    try { JSON.parse(line); } catch { throw new Error('Export response was not valid JSONL; output preserved.'); }
  }
  return lines;
}
export async function fetchExportPage(url: URL, options: ExportOptions, deadline: number) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error('Export time limit reached; output preserved.');
  let response: Response;
  try {
    response = await fetch(url, { headers: { Authorization: `Bearer ${options.secret}`, Accept: 'application/x-ndjson' },
      redirect: 'error', signal: AbortSignal.timeout(Math.min(30000, remaining)) });
  } catch { throw new Error('Export request failed; check server availability, URL, and connection.'); }
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error(`Export failed (HTTP ${response.status}); output preserved.`);
  }
  const lines = records(await boundedBody(response));
  const cursor = response.headers.get('x-export-next-cursor');
  if (cursor && (!/^[A-Za-z0-9_.-]{1,1024}$/.test(cursor) || lines.length === 0)) {
    throw new Error('Export continuation was invalid; output preserved.');
  }
  return { lines, cursor };
}
