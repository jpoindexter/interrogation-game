import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generatedChecks, generatedProbes } from '../scripts/evaluation/generated-checks';
import { GENERATED_SCENARIOS } from '../scripts/evaluation/generated-corpus';
import { authoredCaseData } from '../src/lib/gameplay/session';

test('predeclared generation checks expose wrong difficulty, counts, malformed facts and literal public leakage', () => {
  const facts: Record<string, unknown> = { ...authoredCaseData(), detective_leads: ['Check times', 'Check names', 'Check records'] };
  assert.deepEqual(generatedChecks(facts, GENERATED_SCENARIOS[0]), {
    schema: true, difficulty: true, triggerCount: true, leadCount: true, publicDisclosure: true,
  });
  assert.equal(generatedChecks({ ...facts, difficulty: 'expert' }, GENERATED_SCENARIOS[0]).difficulty, false);
  assert.equal(generatedChecks({ ...facts, stress_triggers: ['one'] }, GENERATED_SCENARIOS[0]).triggerCount, false);
  assert.equal(generatedChecks({ ...facts, detective_leads: ['one'] }, GENERATED_SCENARIOS[0]).leadCount, false);
  assert.equal(generatedChecks({ ...facts, the_truth: '' }, GENERATED_SCENARIOS[0]).schema, false);
  assert.equal(generatedChecks({ ...facts, briefing: `Read this: ${facts.the_truth}` }, GENERATED_SCENARIOS[0]).publicDisclosure, false);
});

test('unrelated-evidence probe alleges a different person and claim without supplying canonical support', () => {
  const facts = { the_lie: 'Public false claim', the_truth: 'PRIVATE_TRUTH_SENTINEL', the_contradiction: 'PRIVATE_PROOF_SENTINEL' };
  const [supported, unrelated] = generatedProbes(facts);
  assert.equal(supported.expected, true); assert.match(supported.accusation, /PRIVATE_TRUTH_SENTINEL/);
  assert.equal(unrelated.expected, false); assert.match(unrelated.accusation, /Dana Example/);
  assert.doesNotMatch(unrelated.accusation, /Public false claim/);
  assert.match(unrelated.accusation, /parking receipt/);
  assert.doesNotMatch(unrelated.accusation, /PRIVATE_TRUTH_SENTINEL|PRIVATE_PROOF_SENTINEL/);
  assert.equal(GENERATED_SCENARIOS.length, 3);
  assert.equal(new Set(GENERATED_SCENARIOS.map(scenario => scenario.setting)).size, 3);
});
