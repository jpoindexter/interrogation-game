#!/usr/bin/env npx tsx
// Usage: npx tsx scripts/export-data.ts --output=data/export.jsonl --limit=1000
// Env: EXPORT_SECRET, EXPORT_BASE_URL (default http://localhost:3000)

import { writeFileSync } from 'fs';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? 'true'];
  }),
);

const baseUrl = process.env.EXPORT_BASE_URL || 'http://localhost:3000';
const secret = process.env.EXPORT_SECRET;
if (!secret) { console.error('EXPORT_SECRET env var required'); process.exit(1); }

const limit = args.limit || '1000';
const output = args.output || 'data/export.jsonl';
const params = new URLSearchParams({ secret, limit });
if (args.outcome) params.set('outcome', args.outcome);
if (args.difficulty) params.set('difficulty', args.difficulty);

const url = `${baseUrl}/api/export?${params}`;
console.log(`Fetching ${url}`);

const res = await fetch(url);
if (!res.ok) {
  console.error(`HTTP ${res.status}: ${await res.text()}`);
  process.exit(1);
}

const body = await res.text();
const lines = body.trim().split('\n').filter(Boolean);
console.log(`Received ${lines.length} records`);

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, body);
console.log(`Written to ${output}`);
