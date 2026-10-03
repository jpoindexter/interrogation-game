import { withAiWorkScope, reserveAiWork } from '../src/lib/limits/ai-scope';
import { AiWorkError } from '../src/lib/limits/ai-policy';

async function main() {
  const [scope, attempts] = process.argv.slice(2);
  process.stdout.write('READY\n');
  await new Promise<void>(resolve => process.stdin.once('data', resolve));
  const results: string[] = [];
  for (let attempt = 0; attempt < Number(attempts); attempt++) {
    for (let retry = 0; retry < 200; retry++) {
      try {
        const reserve = () => reserveAiWork({ instructions: '', input: 'x', schema: {} });
        if (scope === 'operator') reserve(); else withAiWorkScope(scope, reserve);
        results.push('allowed'); break;
      } catch (error) {
        if (!(error instanceof AiWorkError)) throw error;
        if (error.code !== 'AI_BUDGET_UNAVAILABLE' || retry === 199) { results.push(error.code); break; }
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    }
  }
  process.stdout.write(JSON.stringify(results));
}
void main();
