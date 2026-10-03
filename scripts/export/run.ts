import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname } from 'node:path';
import type { ExportOptions } from './options';

function countRecords(body: string): number {
  const lines = body.split('\n').filter(line => line.trim());
  for (const line of lines) {
    try { JSON.parse(line); } catch { throw new Error('Export response was not valid JSONL; output preserved.'); }
  }
  return lines.length;
}

async function saveExport(output: string, body: string): Promise<void> {
  const temporary = `${output}.${randomUUID()}.tmp`;
  try {
    await mkdir(dirname(output), { recursive: true });
    await writeFile(temporary, body, { mode: 0o600, flag: 'wx' });
    await rename(temporary, output);
  } catch {
    throw new Error('Could not save export; check the output directory and permissions.');
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined);
  }
}

export async function runExport(options: ExportOptions): Promise<number> {
  let response: Response;
  try {
    response = await fetch(options.url, {
      headers: { Authorization: `Bearer ${options.secret}`, Accept: 'application/x-ndjson' },
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new Error('Export request failed; check server availability, URL, and connection.');
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error(`Export failed (HTTP ${response.status}); output preserved.`);
  }
  let body: string;
  try { body = await response.text(); } catch { throw new Error('Export response was interrupted; output preserved.'); }
  const records = countRecords(body);
  await saveExport(options.output, body);
  return records;
}
