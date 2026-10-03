import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { POST as interrogate } from '../app/api/interrogate/route';
import { createSession, getSession, deleteSession } from '../src/lib/session/store';
import { inspectDisclosure } from '../src/lib/session/disclosure';
import { generationFixture } from './generation-fixtures';
import { disclosureExamples, disclosureFacts as facts } from './current-disclosure-fixtures';

const releaseQuestions = ['Describe the original visitor record.', 'Who signed that visitor record?',
  'When was the visitor record written?'];
const paths = ['tests/current-disclosure-fixtures.ts', 'tests/current-disclosure-acceptance.test.ts',
  'app/api/interrogate/route.ts', 'src/lib/session/disclosure.ts', 'src/lib/session/actor-context.ts',
  'src/lib/session/case-disclosure.ts', 'src/lib/case-disclosure-policy.ts', 'src/lib/session/turn.ts',
  'src/lib/ai/prompts/suspect.ts', 'src/lib/ai/prompts/suspect-text.json'];

test('current disclosure policy: labeled route observations and authoritative evidence release', async t => {
  await generationFixture(t);
  const settings = { AI_PROVIDER: 'openai', AI_RAG_ENABLED: 'false', OPENAI_API_KEY: 'synthetic-test',
    OPENAI_MODEL: 'controlled-disclosure-fixture', EXPORT_STORAGE: 'local' };
  const previous = Object.fromEntries(Object.keys(settings).map(key => [key, process.env[key]]));
  Object.assign(process.env, settings);
  t.after(() => { for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  } });
  let nextText = ''; let expectedQuestion = ''; let released = false; let calls = 0;
  t.mock.method(globalThis, 'fetch', async (url: unknown, init: RequestInit) => {
    assert.equal(String(url), 'https://api.openai.com/v1/responses');
    calls++;
    const payload = JSON.parse(String(init.body));
    const system = String(payload.input[0].content);
    const input = JSON.parse(payload.input[1].content);
    assert.equal(input.playerQuestion, expectedQuestion);
    for (const hidden of [facts.the_truth, facts.suspect_true_story, ...facts.stress_triggers,
      ...facts.deflection_tactics, facts.verbal_tics]) assert.ok(!system.includes(hidden));
    assert.equal(system.includes(facts.the_contradiction), released);
    assert.ok(system.includes(facts.suspect_cover_story));
    return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text',
      text: JSON.stringify({ spoken_response: nextText, stress_level: 0, internal_state: 'Guarded',
        clue_unlocked: 'MODEL-INVENTED clue must not create evidence', caught: false }) }] }] });
  });
  async function turn(id: string, question: string, requestId = crypto.randomUUID()) {
    expectedQuestion = question;
    const response = await interrogate(new NextRequest('http://localhost/api/interrogate', {
      method: 'POST', body: JSON.stringify({ sessionId: id, playerQuestion: question, requestId }),
    }));
    assert.equal(response.status, 200);
    return response.json();
  }
  const observations = [];
  for (const item of disclosureExamples) {
    const id = createSession(facts, [], 0, 'unlimited');
    t.after(() => deleteSession(id));
    released = false;
    if (item.afterRelease) {
      nextText = 'I stand by my account.';
      for (const [index, question] of releaseQuestions.entries()) {
        const requestId = crypto.randomUUID();
        const response = await turn(id, question, requestId);
        assert.equal(response.clues.length, index === 2 ? 1 : 0);
        if (index === 2) {
          assert.equal(response.clues[0].text, facts.the_contradiction);
          assert.equal(response.clues[0].origin, 'case-record');
          const before = calls;
          assert.deepEqual(await turn(id, question, requestId), response);
          assert.equal(calls, before);
        }
      }
      released = true;
    }
    nextText = item.text;
    const decision = inspectDisclosure(getSession(id)!, item.text);
    const response = await turn(id, item.question);
    const withheld = response.spoken_response !== item.text;
    assert.equal(withheld, decision !== 'allowed');
    // Known semantic gaps remain scored failures, never asserted as safe outputs.
    if (!item.semanticGap) assert.equal(withheld, item.shouldWithhold, item.id);
    const session = getSession(id)!;
    assert.equal(session.conversationHistory.at(-1)?.content, response.spoken_response);
    assert.equal(session.conversationHistory.at(-2)?.content, item.question);
    assert.equal(response.clues.length, item.afterRelease ? 1 : 0);
    assert.equal(response.clue_unlocked, null);
    assert.equal(response.caught, false);
    assert.equal(response.outcome, null);
    observations.push({ ...item, decision, withheld, shownText: response.spoken_response,
      falsePositive: !item.shouldWithhold && withheld, falseNegative: item.shouldWithhold && !withheld,
      actorPrivateFactsExcluded: true, exactPlayerQuestionPreserved: true,
      committedTextMatchesShown: true, modelClueIgnored: true });
  }
  const legitimate = observations.filter(row => !row.shouldWithhold).length;
  const restricted = observations.length - legitimate;
  const falsePositives = observations.filter(row => row.falsePositive).length;
  const falseNegatives = observations.filter(row => row.falseNegative).length;
  const report = { executedAt: new Date().toISOString(), datasetVersion: 'current-disclosure-v1',
    transport: 'Controlled Responses transport; actual route, actor prompt, filter and session commit.',
    liveProviderCalls: 0, controlledProviderCalls: calls, model: 'none (synthetic outputs)',
    sourceHashes: Object.fromEntries(await Promise.all(paths.map(async path =>
      [path, createHash('sha256').update(await readFile(path)).digest('hex')]))),
    summary: { cases: observations.length, legitimate, restricted, falsePositives, falseNegatives,
      safetyLabelsMatched: observations.length - falsePositives - falseNegatives,
      semanticSafetyPassed: falseNegatives === 0, deterministicRouteAssertionsPassed: true },
    observations,
    limitation: 'Fixed synthetic outputs do not measure live-model secrecy, leakage prevalence or instruction resistance. Passing route assertions do not erase semantic false negatives.',
  };
  if (process.env.DISCLOSURE_ACCEPTANCE_REPORT) {
    await writeFile(process.env.DISCLOSURE_ACCEPTANCE_REPORT, JSON.stringify(report, null, 2) + '\n');
  }
  t.diagnostic(JSON.stringify(report.summary));
});
