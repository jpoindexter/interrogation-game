import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { runGenerationRequest } from '../src/lib/session/generation-requests';
import { createSessionAt } from '../src/lib/session/store';

async function main() {
  const [operation, requestId] = process.argv.slice(2);
  const response = await runGenerationRequest({ requestId, fingerprint: { difficulty: 'easy', setting: 'office' },
    generate: async context => {
      let checkpoint = context.checkpoint;
      if (!checkpoint) {
        appendFileSync(join(process.env.INTERROGATION_DATA_DIR!, 'generation-calls'), `${operation}\n`, { mode: 0o600 });
        if (operation === 'crash') process.exit(17);
        if (operation === 'forbidden') throw new Error('Replayed request called provider');
        if (operation === 'hold') {
          process.stdout.write('entered\n');
          await new Promise<void>(resolve => process.stdin.once('data', () => resolve()));
        }
        checkpoint = { data: { difficulty: 'easy', case_number: '321', the_truth: 'Synthetic private truth' } };
        context.saveCheckpoint(checkpoint);
        if (operation === 'checkpoint-crash') {
          process.stdout.write(JSON.stringify({ sessionId: context.sessionId }));
          process.exit(18);
        }
      }
      const sessionId = createSessionAt({ sessionId: context.sessionId, caseData: checkpoint.data as Record<string, unknown> });
      if (operation === 'session-crash') { process.stdout.write(JSON.stringify({ sessionId })); process.exit(19); }
      return { sessionId, case_number: '321', difficulty: 'easy' };
    } });
  process.stdout.write(JSON.stringify(response));
}
void main().catch(() => { process.exitCode = 1; });
