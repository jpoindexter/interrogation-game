import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { hasCode } from '../private-files';
import { readExport, type GameExport } from './storage';
import { validExportKey, type ExportKey } from './cursor';
import { EXPORT_PAGE_BYTES, exportLine, OversizedExportError, type ExportPage } from './page';
import type { ExportQuery } from './query';

function compare(left: ExportKey, right: ExportKey): number {
  return Date.parse(right.createdAt) - Date.parse(left.createdAt) || right.id.localeCompare(left.id);
}
function filenames(): string[] {
  let names: string[];
  try { names = readdirSync(resolve(process.env.INTERROGATION_DATA_DIR || '.local', 'exports')); }
  catch (error) { if (hasCode(error, 'ENOENT')) return []; throw error; }
  return names;
}
function matches(row: GameExport, query: ExportQuery): boolean {
  return (!query.outcome || row.outcome === query.outcome) && (!query.difficulty || row.difficulty === query.difficulty)
    && (!query.setting || row.setting === query.setting);
}
function localKeys(query: ExportQuery, after?: ExportKey): ExportKey[] {
  const keys: ExportKey[] = [];
  // Legacy files have no timestamp/filter index. Read one at a time, retaining only keys.
  for (const name of filenames()) {
    if (!/^[a-f0-9]{48}\.json$/.test(name)) continue;
    const row = readExport(name.slice(0, -5))?.record;
    if (!row) continue;
    if (row.session_id !== name.slice(0, -5)) throw new Error('Invalid local export identity');
    if (!matches(row, query)) continue;
    const key = { id: row.session_id, createdAt: row.created_at };
    if (!validExportKey(key, 'local')) throw new Error('Invalid local export key');
    if (!after || compare(key, after) > 0) keys.push(key);
  }
  return keys.sort(compare).slice(query.offset, query.offset + query.limit + 1);
}
export function readLocalExportPage(query: ExportQuery, after?: ExportKey): ExportPage {
  const keys = localKeys(query, after), lines: string[] = [];
  let bytes = 0, previous: ExportKey | undefined;
  for (const key of keys) {
    if (lines.length === query.limit) return { body: lines.join(''), count: lines.length, next: previous };
    const row = readExport(key.id)?.record;
    if (!row || row.created_at !== key.createdAt || !matches(row, query)) throw new Error('Export changed during download; retry this page');
    const line = exportLine(row), size = Buffer.byteLength(line);
    if (size > EXPORT_PAGE_BYTES && lines.length === 0) throw new OversizedExportError(size);
    if (bytes + size > EXPORT_PAGE_BYTES) return { body: lines.join(''), count: lines.length, next: previous };
    lines.push(line); bytes += size; previous = key;
  }
  return { body: lines.join(''), count: lines.length };
}
