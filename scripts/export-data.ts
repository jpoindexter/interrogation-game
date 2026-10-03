#!/usr/bin/env npx tsx
// Usage: npx tsx scripts/export-data.ts --output=data/export.jsonl --limit=1000
// Follows bounded server pages up to --limit total records (default 1000).
// Env: EXPORT_SECRET, EXPORT_BASE_URL (default http://localhost:3000)

import { readExportOptions } from './export/options';
import { runExport } from './export/run';

async function main(): Promise<void> {
  const options = readExportOptions(process.argv.slice(2), process.env);
  console.log('Fetching game export…');
  const count = await runExport(options);
  console.log(`Written ${count} records to export file.`);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Export failed.';
  console.error(message);
  process.exitCode = 1;
});
