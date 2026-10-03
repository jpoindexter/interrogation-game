/** Opt-in, three frozen review cases; no generation, retries or mutation of old evidence. */
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { providerConfiguration } from '../../src/lib/ai/provider';
import { reviewGeneratedCase } from '../../src/lib/ai/generated-review/review';
import { acceptsGeneratedReview, REVIEW_VERSION } from '../../src/lib/ai/generated-review/contract';
import type { ReviewScenario } from './generated-review-corpus';

const ids = ['v2-law-device-attribution', 'v1-bank-extra-lie', 'heldout-authored-door-control'];
async function hashes() {
  const names = ['prompt', 'contract', 'comparisons', 'evidence', 'quotes', 'review'];
  const paths = [...names.map(name => `src/lib/ai/generated-review/${name}.ts`),
    'src/lib/ai/provider.ts', 'scripts/evaluation/generated-review-v3-smoke.ts'];
  return Object.fromEntries(await Promise.all(paths.map(async path =>
    [path, createHash('sha256').update(await readFile(path)).digest('hex')])));
}
function outputPath(): string {
  const index = process.argv.indexOf('--output'); const output = process.argv[index + 1];
  if (index < 0 || !output?.endsWith('.json')) throw new Error('Provide a new --output <evidence.json>.');
  return output;
}
async function main() {
  const frozen = JSON.parse(await readFile('docs/audit/evidence/generated-review-v2.expected.json', 'utf8'));
  const corpus = ids.map(id => {
    const item = (frozen.corpus as ReviewScenario[]).find(candidate => candidate.id === id);
    if (!item) throw new Error(`Missing frozen case: ${id}`);
    return item;
  });
  if (!process.argv.includes('--run')) {
    console.log(JSON.stringify({ maxCalls: 3, generationCalls: 0, version: REVIEW_VERSION, corpus }, null, 2)); return;
  }
  const output = outputPath();
  const config = providerConfiguration();
  if (config.provider !== 'codex-local' || config.codexModel !== 'gpt-6.1-sol') throw new Error('Use the current production Codex reviewer.');
  const manifest = { startedAt: new Date().toISOString(), version: REVIEW_VERSION, provider: config.provider,
    model: config.codexModel, maxCalls: 3, generationCalls: 0, maxParallel: 1, corpus, sources: await hashes(),
    limits: 'Three known calibration cases, not a blind or general fairness evaluation. Different model from v2: no isolated prompt-effect claim.',
    cost: { billingPath: 'Codex subscription', apiKeyUsed: false, tokens: 'not exposed', monetaryCost: 'unmeasured' } };
  await writeFile(output.replace(/\.json$/, '.expected.json'), JSON.stringify(manifest, null, 2), { flag: 'wx', mode: 0o600 });
  await writeFile(output, '{}', { flag: 'wx', mode: 0o600 });
  const directory = await mkdtemp(join(tmpdir(), 'interrogation-review-v3-'));
  const previous = process.env.INTERROGATION_DATA_DIR; process.env.INTERROGATION_DATA_DIR = directory;
  const results: Record<string, unknown>[] = [];
  try {
    for (const scenario of corpus) {
      const start = performance.now();
      try {
        const review = await reviewGeneratedCase(scenario.candidate);
        const accepted = acceptsGeneratedReview(review);
        const criteriaMatched = scenario.requiredFailures.every(key => !review[key].pass);
        results.push({ id: scenario.id, elapsedMs: Math.round(performance.now() - start), accepted, criteriaMatched,
          passed: accepted === scenario.expected && criteriaMatched, review });
      } catch (error) {
        results.push({ id: scenario.id, elapsedMs: Math.round(performance.now() - start), passed: false,
          error: error instanceof Error ? error.message : 'Review failed' });
      }
      await writeFile(output, JSON.stringify({ ...manifest, status: 'running', results }, null, 2));
      console.log(`Reviewed ${results.length}/3 frozen cases.`);
    }
    await writeFile(output, JSON.stringify({ ...manifest, status: 'finished', finishedAt: new Date().toISOString(),
      sourcesAfter: await hashes(), results }, null, 2));
  } finally {
    if (previous === undefined) delete process.env.INTERROGATION_DATA_DIR; else process.env.INTERROGATION_DATA_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Review smoke failed'); process.exitCode = 1; });
