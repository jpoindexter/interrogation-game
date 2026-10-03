/** Deliberate opt-in live local inference. Default invocation only previews authored criteria. */
import { writeFile } from 'node:fs/promises';
import { CORPUS } from './evaluation/corpus';
import { runItem, sourceHashes } from './evaluation/runner';
import { providerConfiguration } from '../src/lib/ai/provider';

async function main() {
  const args = process.argv.slice(2);
  if (!args.includes('--run')) {
    console.log(JSON.stringify({ mode: 'dry-run', calls: 0, corpus: CORPUS }, null, 2));
    return;
  }
  const output = args[args.indexOf('--output') + 1];
  if (!args.includes('--output') || !output?.endsWith('.json')) throw new Error('Use --run --output <new-evidence.json>.');
  const config = providerConfiguration();
  if (config.provider !== 'codex-local') throw new Error('This evaluation is restricted to the local Codex provider.');
  const manifest = { createdAt: new Date().toISOString(), provenance: 'authored-fictional-evaluation',
    provider: config.provider, model: config.codexModel, maxParallel: 2, callBudget: CORPUS.length,
    sourceHashes: await sourceHashes(), criteria: CORPUS };
  await writeFile(output.replace(/\.json$/, '.expected.json'), JSON.stringify(manifest, null, 2), { flag: 'wx', mode: 0o600 });
  await writeFile(output, JSON.stringify({ ...manifest, status: 'running', results: [] }, null, 2), { flag: 'wx', mode: 0o600 });
  const results: Awaited<ReturnType<typeof runItem>>[] = [];
  for (let index = 0; index < CORPUS.length; index += 2) {
    results.push(...await Promise.all(CORPUS.slice(index, index + 2).map(runItem)));
    await writeFile(output, JSON.stringify({ ...manifest, status: 'running', results }, null, 2));
    for (const result of results.slice(-2)) console.log(`${result.id}: ${result.passed ? 'PASS' : 'FAIL'} (${result.elapsedMs} ms)`);
  }
  await writeFile(output, JSON.stringify({ ...manifest, status: 'finished', finishedAt: new Date().toISOString(), results,
    summary: { passed: results.filter(result => result.passed).length, total: results.length,
      limitation: 'One authored case, one sample per item. No broad reliability or safety conclusion.' } }, null, 2));
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Evaluation failed'); process.exitCode = 1; });
