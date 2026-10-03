/** Preview/export authored rehearsal examples. This command never calls a provider or database. */
import { writeFile } from 'node:fs/promises';
import { AUTHORED_PATTERNS } from '../src/lib/ai/fixtures/authored-patterns';

function fixtureRows(): string {
  return AUTHORED_PATTERNS.map((scenario, index) => JSON.stringify({
    id: `authored-v1-${index + 1}`, provenance: 'authored-fixture', observedGameResult: false,
    description: 'Historical fictional rehearsal scenario; outcome and effective questions are authored, not measured.',
    scenario,
  })).join('\n') + '\n';
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(`Dry run: ${AUTHORED_PATTERNS.length} authored fictional examples. No provider calls or database writes.`);
    console.log('Use --output <new-file.jsonl> to export labelled rehearsal fixtures. Existing files are not overwritten.');
    return;
  }
  if (args.length !== 2 || args[0] !== '--output' || !args[1].endsWith('.jsonl')) {
    throw new Error('Usage: tsx scripts/seed-rag.ts [--output <new-file.jsonl>]');
  }
  await writeFile(args[1], fixtureRows(), { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  console.log(`Exported ${AUTHORED_PATTERNS.length} authored rehearsal fixtures. These are not real game outcomes.`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Fixture export failed.');
  process.exitCode = 1;
});
