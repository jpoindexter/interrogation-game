import { readdirSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { hasCode, writePrivateFile } from '../private-files';
export interface GameExport {
  session_id: string; case_data: Record<string, unknown>; conversation: unknown[]; outcome: string;
  difficulty: string; setting: string | null; stats: Record<string, unknown>;
  accusation_text: string | null; accusation_correct: boolean | null; created_at: string;
}
export interface ExportEnvelope {
  record: GameExport;
  delivery: { state: 'saved' | 'pending'; destination: 'local' | 'supabase'; attempts: number };
}
export function exportStorageMode(): 'local' | 'supabase' {
  const mode = process.env.EXPORT_STORAGE || (process.env.VERCEL ? '' : 'local');
  if (mode !== 'local' && mode !== 'supabase') throw new Error('Export storage must be explicitly configured for this deployment');
  if (process.env.VERCEL && mode === 'local') throw new Error('Local export storage is unavailable on Vercel');
  return mode;
}
function directory(): string { return resolve(process.env.INTERROGATION_DATA_DIR || '.local', 'exports'); }
function path(id: string): string {
  if (!/^[a-f0-9]{48}$/.test(id)) throw new Error('Invalid export session ID');
  return join(directory(), `${id}.json`);
}
export function readExport(id: string): ExportEnvelope | null {
  try { return JSON.parse(readFileSync(path(id), 'utf8')); }
  catch (error) { if (hasCode(error, 'ENOENT')) return null; throw error; }
}
export function saveExport(envelope: ExportEnvelope): void { writePrivateFile(path(envelope.record.session_id), envelope); }
export function readLocalExports(): GameExport[] {
  let names: string[];
  try { names = readdirSync(directory()); } catch (error) { if (hasCode(error, 'ENOENT')) return []; throw error; }
  return names.filter(name => /^[a-f0-9]{48}\.json$/.test(name))
    .map(name => readExport(name.slice(0, -5))!.record)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
