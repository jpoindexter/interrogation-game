import type { AiProvenance } from '../ai/contracts';
// Game orchestration; runtime provider is configured by AI_PROVIDER on the server.
import { executionOptions, executionSignal, ensureNotAborted, type AiExecution } from '../ai/execution';
import { requestStructured } from '../ai/provider';
import { assertGeneratedReview } from '../ai/generated-review/review';
import { assertGeneratedContent } from '../ai/generated-content';
import { CASE_SCHEMA } from '../ai/schemas';
import { buildCasePrompt, GENERATED_CASE_OBJECTIVE } from '../ai/prompts/case';

export async function generateCase(settingHint?: string, difficulty = 'medium', execution?: AiExecution | string): Promise<Record<string, unknown>> {
  const options = executionOptions(execution);
  const timeout = Math.min(180000, Math.max(1000, Number(process.env.AI_GENERATION_TIMEOUT_MS) || 120000));
  const signal = executionSignal(options.signal, timeout);
  await options.onProgress?.('generating');
  const provenance: AiProvenance[] = [];
  const onProvenance = (value: AiProvenance) => { provenance.push(value); options.onProvenance?.(value); };
  const generated = await requestStructured({ signal, onProvenance, capability: 'case', instructions: buildCasePrompt(settingHint, difficulty),
    input: 'Generate the fictional case using the required output schema.', schema: CASE_SCHEMA });
  assertGeneratedContent(generated);
  const candidate = { ...generated, objective: GENERATED_CASE_OBJECTIVE };
  await options.onProgress?.('reviewing');
  await assertGeneratedReview(candidate, { signal, onProvenance });
  ensureNotAborted(signal);
  return { ...candidate, _aiProvenance: provenance };
}
