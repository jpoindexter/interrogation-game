import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generationFixture } from './generation-fixtures';
import { passingReview } from './generated-review-fixtures';
import { CASE_SCHEMA } from '../src/lib/ai/schemas';
import { generateCase } from '../src/lib/mistral/generate-case';
import { authoredCaseData } from '../src/lib/gameplay/session';
import { buildCasePrompt, CASE_PROMPT_VERSION } from '../src/lib/ai/prompts/case';

test('generated objective follows runtime win contract even when provider supplies a stronger crime claim', async context => {
  await generationFixture(context);
  const previous = { AI_PROVIDER: process.env.AI_PROVIDER, OPENAI_API_KEY: process.env.OPENAI_API_KEY };
  process.env.AI_PROVIDER = 'openai'; process.env.OPENAI_API_KEY = 'fixture-only';
  const fetch = globalThis.fetch;
  const fixture: Record<string, unknown> = { ...authoredCaseData(), objective: 'Prove the transfer was fraudulent',
    detective_leads: ['Check times', 'Check names', 'Check records'], verbal_tics: 'Pauses briefly.' };
  globalThis.fetch = async (_url, init) => {
    const request = JSON.parse(String(init?.body));
    const output = request.text.format.name === 'interrogation_case-review'
      ? passingReview(fixture)
      : Object.fromEntries(Object.keys(CASE_SCHEMA.properties).map(key => [key, fixture[key]]));
    return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text',
    text: JSON.stringify(output) }] }] });
  };
  try {
    const generated = await generateCase('bank', 'easy');
    assert.equal(generated.objective, 'Identify the false claim');
    assert.equal(generated.the_lie, fixture.the_lie);
    assert.equal(fixture.objective, 'Prove the transfer was fraudulent');
    assert.notEqual(authoredCaseData().objective, generated.objective);
    fixture.the_contradiction = 'A'.repeat(500);
    await assert.rejects(generateCase('bank', 'easy'), /unfinished/);
  } finally {
    globalThis.fetch = fetch;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('versioned generation prompt states semantic constraints without changing judge acceptance', () => {
  const prompt = buildCasePrompt('hospital', 'hard');
  assert.equal(CASE_PROMPT_VERSION, 'one-false-claim-v3');
  assert.match(prompt, /ONE specific false sentence/);
  assert.match(prompt, /Every other material statement.*must agree/);
  assert.match(prompt, /Keep names, identities and job roles consistent/);
  assert.match(prompt, /later log entry alone does not establish later approval/);
  assert.match(prompt, /reachable through a public lead/);
  assert.match(prompt, /exactly 4 stress_triggers/);
});
