#!/usr/bin/env npx tsx
// Preview by default. Operator chooses one bounded batch after reviewing its age and project.
import { readExportRetentionOptions } from './retention/export-options';
import { retainHostedExports } from '../src/lib/storage/hosted/export-retention';

async function main(): Promise<void> {
  const options = readExportRetentionOptions(process.argv.slice(2), process.env);
  console.log(`${options.apply ? 'Applying' : 'Previewing'} one export-retention batch on ${options.project}; expired for at least ${options.days} days.`);
  console.log(JSON.stringify(await retainHostedExports(options)));
  console.log('Scores, compact replay receipts, retry identities and usage remain. Deferred rows require review.');
}

void main().catch(() => {
  console.error('Export retention was not confirmed. Check arguments, project configuration and migration 020. Preview current state before retrying.');
  process.exitCode = 1;
});
