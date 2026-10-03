/** Existing-case review only: dry-run default, eight calls maximum, no new generations. */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { providerConfiguration } from '../../src/lib/ai/provider';
import { reviewGeneratedCase } from '../../src/lib/ai/generated-review/review';
import { acceptsGeneratedReview, REVIEW_VERSION } from '../../src/lib/ai/generated-review/contract';
import type { ReviewScenario } from './generated-review-corpus';
import { generatedReviewV2Corpus } from './generated-review-v2-corpus';

async function sourceHashes() {
  const paths = ['src/lib/ai/generated-review/prompt.ts', 'src/lib/ai/generated-review/contract.ts',
    'src/lib/ai/generated-review/review.ts', 'src/lib/game-ai/generate-case.ts',
    'scripts/evaluation/generated-review-v2-corpus.ts', 'src/lib/ai/generated-review/comparisons.ts',
    'src/lib/ai/generated-review/quotes.ts', 'src/lib/ai/generated-content.ts'];
  return Object.fromEntries(await Promise.all(paths.map(async path =>
    [path, createHash('sha256').update(await readFile(path)).digest('hex')])));
}
async function observe(scenario: ReviewScenario) {
  const startedAt = new Date().toISOString(); const start = performance.now();
  try {
    const review = await reviewGeneratedCase(scenario.candidate);
    const accepted = acceptsGeneratedReview(review);
    const requiredFailuresObserved = scenario.requiredFailures.every(key => !review[key].pass);
    return { id: scenario.id, startedAt, elapsedMs: Math.round(performance.now() - start), expected: scenario.expected,
      accepted, requiredFailuresObserved, passed: accepted === scenario.expected && requiredFailuresObserved, review };
  } catch (error) {
    return { id: scenario.id, startedAt, elapsedMs: Math.round(performance.now() - start), passed: false,
      error: error instanceof Error ? error.message : 'Unknown review error' };
  }
}
async function main() {
  const corpus = await generatedReviewV2Corpus();
  if (!process.argv.includes('--run')) {
    console.log(JSON.stringify({ calls: 0, version: REVIEW_VERSION, scenarios: corpus.map(({ id, expected, requiredFailures, criterion }) => ({ id, expected, requiredFailures, criterion })) }, null, 2)); return;
  }
  const index = process.argv.indexOf('--output'); const output = process.argv[index + 1];
  if (index < 0 || !output?.endsWith('.json')) throw new Error('Provide --output <new-review-evidence.json>.');
  const config = providerConfiguration();
  if (config.provider !== 'codex-local') throw new Error('Live review evaluation requires codex-local.');
  const manifest = { startedAt: new Date().toISOString(), version: REVIEW_VERSION, provider: config.provider,
    model: config.codexModel, maxCalls: 8, maxParallel: 2, generationCalls: 0, corpus, sources: await sourceHashes(),
    limits: 'Six frozen v1 cases plus two held-out authored cases; same-model review, not human judgment or statistical reliability.',
    cost: { billingPath: 'existing Codex subscription', apiKeyUsed: false, tokens: 'not exposed', monetaryCost: 'unmeasured' } };
  await writeFile(output.replace(/\.json$/, '.expected.json'), JSON.stringify(manifest, null, 2), { flag: 'wx', mode: 0o600 });
  await writeFile(output, '{}', { flag: 'wx', mode: 0o600 });
  const results: Awaited<ReturnType<typeof observe>>[] = [];
  for (let offset = 0; offset < corpus.length; offset += 2) {
    results.push(...await Promise.all(corpus.slice(offset, offset + 2).map(observe)));
    await writeFile(output, JSON.stringify({ ...manifest, status: 'running', results }, null, 2));
    console.log(`Reviewed ${results.length}/${corpus.length} saved fictional cases.`);
  }
  await writeFile(output, JSON.stringify({ ...manifest, status: 'finished', finishedAt: new Date().toISOString(),
    sourcesAfter: await sourceHashes(), results, summary: { calls: results.length, matched: results.filter(item => item.passed).length,
      errors: results.filter(item => 'error' in item).length } }, null, 2));
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Review evaluation failed'); process.exitCode = 1; });
