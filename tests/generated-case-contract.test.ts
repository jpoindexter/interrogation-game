import { NextRequest } from 'next/server';
import { POST as createCaseRoute } from '../app/api/generate-case/route';
import { GET as recoverRoute } from '../app/api/session/route';
import { createSession, deleteSession } from '../src/lib/session/store';
import { getSessionRepository } from '../src/lib/session/repository';
import { pickVoice } from '../src/lib/voice/voices';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generationFixture } from './generation-fixtures';
import { passingReview, referencedReviewFixture } from './generated-review-fixtures';
import { CASE_SCHEMA } from '../src/lib/ai/schemas';
import { generateCase } from '../src/lib/game-ai/generate-case';
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
      ? referencedReviewFixture(passingReview(fixture), fixture)
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
  assert.equal(CASE_PROMPT_VERSION, 'direct-evidence-v4');
  assert.match(prompt, /exactly those two true facts plus ONE false/);
  assert.match(prompt, /Do not use device\/account\/badge ownership/);
  assert.match(prompt, /personally recognized the suspect/);
  assert.match(prompt, /public lead names this record/);
  assert.match(prompt, /NEVER evidence completeness/);
  assert.match(prompt, /exactly 4 stress_triggers/);
});


test('generated woman identity persists canonical casting and voice input while recovery preserves earlier portrait assignments', async context => {
  await generationFixture(context);
  const previous = { AI_PROVIDER: process.env.AI_PROVIDER, OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    AI_RAG_ENABLED: process.env.AI_RAG_ENABLED };
  Object.assign(process.env, { AI_PROVIDER: 'openai', OPENAI_API_KEY: 'fixture-only', AI_RAG_ENABLED: 'false' });
  context.after(() => { for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  } });
  const fixture: Record<string, unknown> = { ...authoredCaseData(), suspect_name: 'Mira Venn', suspect_gender: 'woman',
    suspect_role: 'Operations analyst', objective: 'Identify the false claim',
    detective_leads: ['Check times', 'Check names', 'Check records'], verbal_tics: 'Pauses briefly.' };
  let calls = 0;
  context.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    calls++;
    const request = JSON.parse(String(init.body));
    const output = request.text.format.name === 'interrogation_case-review'
      ? referencedReviewFixture(passingReview(fixture), fixture)
      : Object.fromEntries(Object.keys(CASE_SCHEMA.properties).map(key => [key, fixture[key]]));
    return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(output) }] }] });
  });
  const request = () => new NextRequest('http://localhost/api/generate-case', { method: 'POST',
    body: JSON.stringify({ requestId: 'canonical-identity-check', setting: 'bank', difficulty: 'easy', playMode: 'relaxed' }) });
  const response = await createCaseRoute(request());
  assert.equal(response.status, 200);
  const created = await response.json();
  context.after(() => deleteSession(created.sessionId));
  assert.equal(created.suspect_gender, 'female'); assert.equal(created.portraitId, '06-f');
  const stored = getSessionRepository().load(created.sessionId)!.session.caseData;
  assert.equal(stored.suspect_gender, 'female'); assert.equal(stored.portraitId, '06-f');
  assert.equal(pickVoice(String(stored.suspect_name), String(stored.suspect_gender)), pickVoice('Mira Venn', 'female'));
  const recovered = await recoverRoute(new NextRequest(`http://localhost/api/session?sessionId=${created.sessionId}`));
  assert.equal(recovered.status, 200);
  assert.equal((await recovered.json()).caseData.portraitId, '06-f');
  assert.deepEqual(await (await createCaseRoute(request())).json(), created); assert.equal(calls, 2);
  const legacyId = createSession({ ...fixture, portraitId: '09-m' });
  context.after(() => deleteSession(legacyId));
  const legacy = await recoverRoute(new NextRequest(`http://localhost/api/session?sessionId=${legacyId}`));
  assert.equal(legacy.status, 200);
  const old = (await legacy.json()).caseData;
  assert.equal(old.portraitId, '09-m'); assert.equal(old.suspect_gender, 'woman');
  assert.equal(pickVoice(old.suspect_name, old.suspect_gender), pickVoice('Mira Venn', 'male'));
});
