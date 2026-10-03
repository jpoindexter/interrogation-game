import { validateCaseData } from '../../src/lib/session/case-validation';
import { DIFFICULTY_CLUES } from '../../src/lib/game-state';
import type { GeneratedResult } from './generated-runner';
import type { GeneratedCaseScenario } from './generated-corpus';

function normalize(text: unknown): string {
  return String(text ?? '').normalize('NFKC').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
export function generatedChecks(raw: Record<string, unknown>, scenario: GeneratedCaseScenario) {
  const publicFields = [raw.briefing, raw.suspect_cover_story, raw.objective,
    ...(Array.isArray(raw.detective_leads) ? raw.detective_leads : [])].map(normalize);
  const privateFields = [raw.the_truth, raw.the_contradiction].map(normalize).filter(Boolean);
  return {
    schema: validateCaseData(raw) !== null,
    difficulty: raw.difficulty === scenario.difficulty,
    triggerCount: Array.isArray(raw.stress_triggers) && raw.stress_triggers.length === DIFFICULTY_CLUES[scenario.difficulty],
    leadCount: Array.isArray(raw.detective_leads) && raw.detective_leads.length === 3
      && raw.detective_leads.every(lead => typeof lead === 'string' && lead.trim()),
    publicDisclosure: !privateFields.some(secret => publicFields.some(field => field.includes(secret))),
  };
}
export function generatedProbes(caseData: Record<string, unknown>) {
  return [
    { id: 'supported-accusation', expected: true,
      accusation: `Your false claim is: "${caseData.the_lie}". What actually happened is: "${caseData.the_truth}". The contradiction supporting my accusation is: "${caseData.the_contradiction}".` },
    { id: 'unrelated-evidence', expected: false,
      accusation: 'I accuse an unrelated person, Dana Example, of lying about painting a bicycle blue. My ONLY evidence is a parking receipt from another city. This accusation concerns Dana and the bicycle, not this suspect or the workplace claim in this case.'  },
  ];
}
export function summarizeGenerated(results: GeneratedResult[]) {
  const timings = results.flatMap(result => [result.generation.elapsedMs, ...result.probes.map(probe => probe.elapsedMs)]).sort((a, b) => a - b);
  return { generationFlows: results.length, judgeRequests: results.reduce((sum, result) => sum + result.probes.length, 0),
    providerCalls: summarizeProviderCalls(results),
    generationErrors: results.filter(result => result.generation.error).length,
    judgePassed: results.flatMap(result => result.probes).filter(probe => probe.passed).length,
    minMs: timings[0], medianMs: timings[Math.floor(timings.length / 2)], maxMs: timings.at(-1) };
}

function countedCalls(values: (number | null)[]) {
  const minimumConfirmed = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  return { actual: values.includes(null) ? null : minimumConfirmed, minimumConfirmed };
}
export function summarizeProviderCalls(results: GeneratedResult[]) {
  const candidate = countedCalls(results.map(result => result.generation.providerCalls.candidate));
  const review = countedCalls(results.map(result => result.generation.providerCalls.review));
  const judge = countedCalls(results.flatMap(result => result.probes.map(probe => probe.providerCalls)));
  const phases = { candidate, review, judge };
  return { actual: { candidate: candidate.actual, review: review.actual, judge: judge.actual,
    total: countedCalls(Object.values(phases).map(phase => phase.actual)).actual },
    minimumConfirmed: { candidate: candidate.minimumConfirmed, review: review.minimumConfirmed,
      judge: judge.minimumConfirmed, total: Object.values(phases).reduce((sum, phase) => sum + phase.minimumConfirmed, 0) },
    basis: 'Counts follow the current no-retry capability contract. Null means the failed capability did not expose whether inference ran; it does not mean zero.' };
}
