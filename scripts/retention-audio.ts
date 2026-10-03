#!/usr/bin/env npx tsx
// Defaults to preview. Uses the same explicit project confirmation as payload retention.
import { readRetentionOptions } from './retention/options';
import { cleanHostedAudio } from '../src/lib/voice/hosted-audio-cleanup';

async function main(): Promise<void> {
  const options = readRetentionOptions(process.argv.slice(2), process.env);
  console.log(`${options.apply ? 'Applying' : 'Previewing'} one expired-audio batch on ${options.project}.`);
  const report = await cleanHostedAudio(options);
  console.log(JSON.stringify(report));
  console.log('Unknown buckets remain deferred. Retry identities and usage are preserved. No automatic retry runs.');
  if (report.kind === 'applied' && report.pending > 0) process.exitCode = 1;
}

void main().catch(() => {
  console.error('Audio cleanup was not confirmed. Check project configuration and migration 019. Preview before retrying; pending leases last five minutes.');
  process.exitCode = 1;
});
