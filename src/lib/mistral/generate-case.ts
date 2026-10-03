// Compatibility entrypoint; runtime provider is configured by AI_PROVIDER on the server.
import { executionOptions, executionSignal, ensureNotAborted, type AiExecution } from '../ai/execution';
import { requestStructured, providerConfiguration } from '../ai/provider';
import { assertGeneratedReview } from '../ai/generated-review/review';
import { assertGeneratedContent } from '../ai/generated-content';
import { CASE_SCHEMA } from '../ai/schemas';
import { buildCasePrompt, GENERATED_CASE_OBJECTIVE } from '../ai/prompts/case';

export async function generateCase(settingHint?: string, difficulty = 'medium', execution?: AiExecution | string): Promise<Record<string, unknown>> {
  const signal = executionSignal(executionOptions(execution).signal, providerConfiguration().timeoutMs);
  const generated = await requestStructured({ signal, capability: 'case', instructions: buildCasePrompt(settingHint, difficulty),
    input: 'Generate the fictional case using the required output schema.', schema: CASE_SCHEMA });
  assertGeneratedContent(generated);
  const candidate = { ...generated, objective: GENERATED_CASE_OBJECTIVE };
  await assertGeneratedReview(candidate, { signal });
  ensureNotAborted(signal);
  return candidate;
}
