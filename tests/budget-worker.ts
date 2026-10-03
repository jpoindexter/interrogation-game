import { rateLimit } from '../src/lib/rate-limit';
import { reserveVoiceUsage } from '../src/lib/voice/budget';
import { VoiceError } from '../src/lib/voice/errors';
import { acquireFileLock } from '../src/lib/session/file-lock';
import { join } from 'node:path';

async function main() {
  const [mode, key, units] = process.argv.slice(2);
  process.stdout.write('READY\n');
  await new Promise<void>(resolve => process.stdin.once('data', () => resolve()));
  if (mode === 'crash-lock') {
    if (!acquireFileLock(join(process.env.INTERROGATION_DATA_DIR!, 'limits/usage.lock'))) process.exit(2);
    process.exit(0);
  }
  for (let attempt = 0; attempt < 200; attempt++) {
    try {
      if (mode === 'endpoint') process.stdout.write(`${JSON.stringify(rateLimit(key, Number(units)))}\n`);
      else { reserveVoiceUsage(key, 'recordings', Number(units)); process.stdout.write('true\n'); }
      return;
    } catch (error) {
      if (!(error instanceof VoiceError)) throw error;
      if (error.status !== 503 || attempt === 199) { process.stdout.write(`${error.status}\n`); return; }
      await new Promise(resolve => setTimeout(resolve, 5));
    }
  }
}
void main();
