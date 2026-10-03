import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { assertGeneratedContent } from '../src/lib/ai/generated-content';

test('the actual v2 schema-ceiling fragments cannot enter a newly playable generated case', () => {
  const evidence = JSON.parse(readFileSync('docs/audit/evidence/generated-cases-v2.json', 'utf8'));
  assert.equal(evidence.results.length, 3);
  for (const result of evidence.results) {
    const candidate = result.generation.caseData;
    assert.equal(typeof candidate?.the_contradiction, 'string');
    assert.equal(candidate.the_contradiction.length, 500);
    assert.throws(() => assertGeneratedContent(candidate), /unfinished/);
  }
});

test('a complete sentence at the size boundary and shorter prose are not rejected by the narrow check', () => {
  assert.doesNotThrow(() => assertGeneratedContent({ the_contradiction: `${'A'.repeat(499)}.` }));
  assert.doesNotThrow(() => assertGeneratedContent({ the_contradiction: 'The signed arrival contradicts the claim of no return.' }));
});
