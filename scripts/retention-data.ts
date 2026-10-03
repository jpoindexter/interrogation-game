#!/usr/bin/env npx tsx
// Environment: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Defaults to preview; never loops.
import { readRetentionOptions } from './retention/options';
import { retainHostedPayloads } from '../src/lib/storage/hosted/retention';

async function main(): Promise<void> {
  const options = readRetentionOptions(process.argv.slice(2), process.env);
  console.log(`${options.apply ? 'Applying' : 'Previewing'} one expired-payload batch on ${options.project}.`);
  const report = await retainHostedPayloads(options);
  console.log(JSON.stringify(report));
  console.log('Identity tombstones and usage remain. Deferred exports, scores and audio objects are not erased.');
}

void main().catch(() => {
  // Provider errors can contain credentials or request payloads. Never print them.
  console.error('Retention was not confirmed. Check arguments, project configuration and migration 018. Preview current state before retrying.');
  process.exitCode = 1;
});
