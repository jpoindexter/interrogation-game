import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { authoredCaseData } from '../../src/lib/gameplay/session';
import { evaluateAccusation } from '../../src/lib/mistral/evaluate';
import { interrogate } from '../../src/lib/mistral/interrogate';
import type { ConversationMessage, SuspectCase } from '../../src/lib/ai/types';
import type { JudgeCase } from '../../src/lib/ai/prompts/judge';
import type { EvaluationItem } from './corpus';

export function grade(item: EvaluationItem, output: Record<string, unknown>) {
  if (item.capability === 'judge') return { passed: output.correct === item.expectedVerdict,
    observedVerdict: output.correct, checks: [`expected correct=${item.expectedVerdict}`] };
  const spoken = String(output.spoken_response ?? '');
  const checks = [{ description: 'nonempty spoken reply', passed: spoken.trim().length > 0 },
    ...(item.requiredPatterns ?? []).map(pattern => ({ description: `required ${pattern}`, passed: new RegExp(pattern, 'i').test(spoken) })),
    ...(item.forbiddenPatterns ?? []).map(pattern => ({ description: `forbidden ${pattern}`, passed: !new RegExp(pattern, 'i').test(spoken) }))];
  return { passed: checks.every(check => check.passed), checks,
    limitation: 'Lexical checks require human review of the recorded spoken response; they are not a semantic safety proof.' };
}

export async function runItem(item: EvaluationItem) {
  const startedAt = new Date().toISOString(); const start = performance.now();
  const facts = authoredCaseData();
  const history: ConversationMessage[] = [{ role: 'assistant', content: String(facts.suspect_cover_story) }, ...(item.extraHistory ?? [])];
  try {
    const output = item.capability === 'judge'
      ? await evaluateAccusation(facts as JudgeCase, history, item.input)
      : await interrogate(facts as SuspectCase, history, item.input, 1, 0, []);
    return { id: item.id, startedAt, elapsedMs: Math.round(performance.now() - start), output, ...grade(item, output) };
  } catch (error) {
    return { id: item.id, startedAt, elapsedMs: Math.round(performance.now() - start), passed: false,
      error: error instanceof Error ? error.message : 'Unknown evaluation failure' };
  }
}

export async function sourceHashes() {
  const paths = ['src/lib/ai/prompts/judge.ts', 'src/lib/ai/prompts/suspect.ts', 'src/lib/ai/prompts/suspect-text.json',
    'src/lib/mistral/evaluate.ts', 'src/lib/mistral/interrogate.ts', 'src/lib/gameplay/demo-case.ts'];
  return Object.fromEntries(await Promise.all(paths.map(async path =>
    [path, createHash('sha256').update(await readFile(path)).digest('hex')])));
}
