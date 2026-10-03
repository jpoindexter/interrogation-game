import { mkdir, open, rename, rm } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname } from 'node:path';
import type { ExportOptions } from './options';
import { fetchExportPage } from './page';

async function collect(options: ExportOptions, file: FileHandle): Promise<number> {
  const limit = Number(options.url.searchParams.get('limit'));
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) throw new Error('Invalid export record limit.');
  const seen = new Set<string>(), deadline = Date.now() + 300000;
  const url = new URL(options.url);
  let count = 0;
  while (count < limit) {
    const page = await fetchExportPage(url, options, deadline);
    const selected = page.lines.slice(0, limit - count);
    if (selected.length) await file.writeFile(`${selected.join('\n')}\n`);
    count += selected.length;
    if (!page.cursor || count === limit) return count;
    if (seen.has(page.cursor)) throw new Error('Export continuation repeated; output preserved.');
    seen.add(page.cursor);
    // The server controls only an opaque cursor, never the credential destination.
    url.searchParams.delete('offset'); url.searchParams.set('cursor', page.cursor);
  }
  return count;
}

/** All pages land in a private temporary file; a failed later page never replaces prior output. */
export async function runExport(options: ExportOptions): Promise<number> {
  const temporary = `${options.output}.${randomUUID()}.tmp`;
  let file: FileHandle | undefined;
  try {
    await mkdir(dirname(options.output), { recursive: true });
    file = await open(temporary, 'wx', 0o600);
    const count = await collect(options, file);
    await file.sync(); await file.close(); file = undefined;
    await rename(temporary, options.output);
    return count;
  } finally {
    await file?.close().catch(() => undefined);
    await rm(temporary, { force: true }).catch(() => undefined);
  }
}
