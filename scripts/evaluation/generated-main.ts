/** Dry-run default. Maximum 3 candidate + 3 review + 6 judge calls; at most two concurrent. */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { REVIEW_VERSION } from '../../src/lib/ai/generated-review/contract';
import { CASE_PROMPT_VERSION } from '../../src/lib/ai/prompts/case';
import { providerConfiguration } from '../../src/lib/ai/provider';
import { GENERATED_CRITERIA, GENERATED_SCENARIOS, GENERATED_PROVIDER_BUDGET } from './generated-corpus';
import { generatedProbes, summarizeGenerated } from './generated-checks';
import { generateScenario, judgeGenerated, type GeneratedResult } from './generated-runner';

async function hashes() {
  const paths = ['scripts/evaluation/generated-corpus.ts', 'scripts/evaluation/generated-checks.ts',
    'src/lib/ai/prompts/case.ts', 'src/lib/ai/prompts/case-text.json', 'src/lib/ai/prompts/judge.ts',
    'src/lib/ai/generated-review/prompt.ts', 'src/lib/ai/generated-review/contract.ts',
    'src/lib/ai/generated-review/review.ts', 'scripts/evaluation/generated-runner.ts',
    'src/lib/ai/schemas.ts', 'src/lib/session/case-validation.ts', 'src/lib/game-ai/generate-case.ts'];
  return Object.fromEntries(await Promise.all(paths.map(async path =>
    [path, createHash('sha256').update(await readFile(path)).digest('hex')])));
}
async function runCases(save: (results: GeneratedResult[]) => Promise<void>) {
  const results: GeneratedResult[] = [];
  for (let index = 0; index < GENERATED_SCENARIOS.length; index += 2) {
    results.push(...await Promise.all(GENERATED_SCENARIOS.slice(index, index + 2).map(generateScenario)));
    await save(results);
    console.log(`Generated ${results.length}/${GENERATED_SCENARIOS.length} fictional cases.`);
  }
  const jobs = results.filter(result => result.generation.checks?.schema)
    .flatMap(result => generatedProbes(result.generation.caseData!).map(probe => ({ result, probe })));
  for (let index = 0; index < jobs.length; index += 2) {
    await Promise.all(jobs.slice(index, index + 2).map(async ({ result, probe }) => {
      const observed = await judgeGenerated(result, probe); result.probes.push(observed);
      console.log(`${result.scenario.id}/${probe.id}: ${observed.passed ? 'PASS' : 'FAIL'} (${observed.elapsedMs} ms)`);
    }));
    await save(results);
  }
  return results;
}
async function main() {
  if (!process.argv.includes('--run')) { console.log(JSON.stringify({ calls: 0, maximumProviderCalls: GENERATED_PROVIDER_BUDGET, scenarios: GENERATED_SCENARIOS, criteria: GENERATED_CRITERIA }, null, 2)); return; }
  const index = process.argv.indexOf('--output'); const output = process.argv[index + 1];
  if (index < 0 || !output?.endsWith('.json')) throw new Error('Use --run --output <new-generated-evidence.json>.');
  const config = providerConfiguration();
  if (config.provider !== 'codex-local') throw new Error('Generated evaluation only uses the local Codex provider.');
  const manifest = { createdAt: new Date().toISOString(), provider: config.provider, model: config.codexModel, promptVersion: CASE_PROMPT_VERSION, reviewVersion: REVIEW_VERSION,
    maxParallel: 2, maxGenerationFlows: 3, maximumProviderCalls: GENERATED_PROVIDER_BUDGET, scenarios: GENERATED_SCENARIOS, criteria: GENERATED_CRITERIA,
    sourceHashes: await hashes(), cost: { billingPath: 'existing Codex subscription', apiKeyUsed: false,
      tokens: 'not exposed by production capability return', monetaryCost: 'not measured; not claimed free' } };
  await writeFile(output.replace(/\.json$/, '.expected.json'), JSON.stringify(manifest, null, 2), { flag: 'wx', mode: 0o600 });
  await writeFile(output, '{}', { flag: 'wx', mode: 0o600 });
  const save = async (results: GeneratedResult[]) => writeFile(output, JSON.stringify({ ...manifest, status: 'running', results }, null, 2));
  const results = await runCases(save);
  await writeFile(output, JSON.stringify({ ...manifest, status: 'finished', finishedAt: new Date().toISOString(),
    sourceHashesAfter: await hashes(), results, summary: summarizeGenerated(results) }, null, 2));
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Evaluation failed'); process.exitCode = 1; });
