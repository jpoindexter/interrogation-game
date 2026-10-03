import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { generatedReviewV2Corpus } from '../scripts/evaluation/generated-review-v2-corpus';

test('v2 preserves all six frozen candidates and criteria and declares only two additional controls', async () => {
  const frozen = JSON.parse(await readFile('docs/audit/evidence/generated-review-v1.expected.json', 'utf8'));
  const corpus = await generatedReviewV2Corpus();
  assert.deepEqual(corpus.slice(0, 6), frozen.corpus);
  assert.equal(corpus.length, 8);
  assert.equal(new Set(corpus.map(item => item.id)).size, 8);
  assert.equal(corpus[6].expected, true);
  assert.deepEqual(corpus[7].requiredFailures, ['singleFalseClaim', 'canonicalConsistency']);
});
