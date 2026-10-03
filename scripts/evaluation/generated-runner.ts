import { AiError } from '../../src/lib/ai/contracts';
import { generateCase } from '../../src/lib/mistral/generate-case';
import { evaluateAccusation } from '../../src/lib/mistral/evaluate';
import type { JudgeCase } from '../../src/lib/ai/prompts/judge';
import { generatedChecks, generatedProbes } from './generated-checks';
import type { GeneratedCaseScenario } from './generated-corpus';

export interface GenerationCallCounts { candidate: number | null; review: number | null }
function failedGenerationCounts(error: unknown): GenerationCallCounts {
  if (error instanceof AiError && error.code === 'CASE_REVIEW_REJECTED') return { candidate: 1, review: 1 };
  if (error instanceof AiError && error.code === 'INVALID_CASE_CONTENT') return { candidate: 1, review: 0 };
  return { candidate: null, review: null }; // The capability does not expose which inference stage failed.
}

export interface GeneratedResult {
  scenario: GeneratedCaseScenario;
  generation: { providerCalls: GenerationCallCounts; startedAt: string; elapsedMs: number; caseData?: Record<string, unknown>; checks?: ReturnType<typeof generatedChecks>; error?: string };
  probes: { id: string; accusation: string; expected: boolean; observed?: boolean; passed: boolean;
    providerCalls: number | null; startedAt: string; elapsedMs: number; output?: Record<string, unknown>; error?: string }[];
}
export async function generateScenario(scenario: GeneratedCaseScenario): Promise<GeneratedResult> {
  const startedAt = new Date().toISOString(); const started = performance.now();
  try {
    const caseData = await generateCase(scenario.setting, scenario.difficulty);
    return { scenario, generation: { startedAt, elapsedMs: Math.round(performance.now() - started),
      caseData, checks: generatedChecks(caseData, scenario), providerCalls: { candidate: 1, review: 1 } }, probes: [] };
  } catch (error) {
    return { scenario, generation: { startedAt, elapsedMs: Math.round(performance.now() - started),
      providerCalls: failedGenerationCounts(error), error: error instanceof Error ? error.message : 'Unknown generation error' }, probes: [] };
  }
}
export async function judgeGenerated(result: GeneratedResult, probe: ReturnType<typeof generatedProbes>[number]) {
  const startedAt = new Date().toISOString(); const started = performance.now();
  try {
    const facts = result.generation.caseData!;
    const output = await evaluateAccusation(facts as JudgeCase, [{ role: 'assistant', content: String(facts.suspect_cover_story) }], probe.accusation);
    return { ...probe, startedAt, elapsedMs: Math.round(performance.now() - started), output,
      providerCalls: 1, observed: output.correct, passed: output.correct === probe.expected };
  } catch (error) {
    return { ...probe, startedAt, elapsedMs: Math.round(performance.now() - started), passed: false, providerCalls: null,
      error: error instanceof Error ? error.message : 'Unknown judge error' };
  }
}
