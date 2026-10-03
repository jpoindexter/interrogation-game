import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { POST as interrogate } from '../app/api/interrogate/route';
import { POST as accuse } from '../app/api/accuse/route';
import { generationFixture } from './generation-fixtures';
import { createSession, getSession, deleteSession } from '../src/lib/session/store';
import { commitTurn } from '../src/lib/session/turn';
import { beginSession } from '../src/lib/session/transitions';
import { actorCase } from '../src/lib/session/actor-context';
import { buildSuspectPrompt } from '../src/lib/ai/prompts/suspect';
import { recordReleaseProgress } from '../src/lib/case-disclosure-policy';
import { inspectDisclosure } from '../src/lib/session/disclosure';
import { authoredCaseData, attachAuthoredGameplay } from '../src/lib/gameplay/session';
import { parsePublicClue } from '../src/lib/clue-contract';

const facts = { difficulty: 'easy', setting: 'office', suspect_name: 'Casey', suspect_role: 'Clerk',
  suspect_cover_story: 'I worked at the desk. I never handled the ledger.', briefing: 'Ask about the witness record.',
  crime: 'The ledger disappeared.', detective_leads: ['Examine the witness record.'],
  suspect_true_story: 'Casey carried the ledger upstairs, witnessed by Pat.',
  the_truth: 'Casey handled the ledger.', the_lie: 'I never handled the ledger.',
  the_contradiction: 'Pat’s signed witness record identifies Casey holding the ledger upstairs at 18:42.',
  stress_triggers: ['Secret witness Pat'], deflection_tactics: ['Invent a secret detail'], verbal_tics: 'Secret biography' };
const response = { spoken_response: 'I stand by my account.', internal_state: 'Guarded', stress_level: 0,
  clue_unlocked: 'An invented observation must not become a case clue.', caught: false };
function request(route: string, id: string, body: object, requestId = crypto.randomUUID()) {
  return new NextRequest(`http://localhost/api/${route}`, { method: 'POST', body: JSON.stringify({ sessionId: id, requestId, ...body }) });
}
function output(value: object) {
  return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }] });
}

test('all difficulties release the first canonical record at the accepted-question boundary even at zero stress, then judge normally', async t => {
  await generationFixture(t);
  const previous = { ...process.env };
  Object.assign(process.env, { AI_PROVIDER: 'openai', AI_RAG_ENABLED: 'false', OPENAI_API_KEY: 'synthetic-test' });
  t.after(() => { for (const key of ['AI_PROVIDER', 'AI_RAG_ENABLED', 'OPENAI_API_KEY']) {
    if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
  } });
  let allowedRecord = false; let judging = false; let calls = 0;
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    const payload = JSON.parse(String(init.body)); calls++;
    if (judging) return output({ correct: true, confession: 'I handled it.', explanation: 'The witness record contradicts my denial.' });
    const prompt = String(payload.input[0].content);
    for (const privateField of [facts.suspect_true_story, facts.the_truth, ...facts.stress_triggers, ...facts.deflection_tactics, facts.verbal_tics]) {
      assert.ok(!prompt.includes(privateField), `private actor input: ${privateField}`);
    }
    assert.equal(prompt.includes(facts.the_contradiction), allowedRecord);
    return output(response);
  });
  for (const difficulty of ['easy', 'medium', 'hard', 'expert']) {
    const id = createSession({ ...facts, difficulty }, [], 0, 'unlimited');
    t.after(() => deleteSession(id));
    allowedRecord = false; judging = false;
    const required = recordReleaseProgress([], difficulty).required;
    for (let index = 0; index < required; index++) {
      const query = { playerQuestion: `Please explain the witness record detail number ${index}.` };
      const requestId = crypto.randomUUID();
      const accepted = await interrogate(request('interrogate', id, query, requestId));
      assert.equal(accepted.status, 200);
      const data = await accepted.json();
      assert.equal(data.stress_level, 0);
      assert.equal(data.clues.length, index === required - 1 ? 1 : 0);
      if (index === required - 1) {
        assert.equal(data.clues[0].text, facts.the_contradiction);
        assert.equal(data.clues[0].origin, 'case-record');
        assert.equal(data.clues[0].source.answer, response.spoken_response);
        assert.equal(parsePublicClue(data.clues[0]).origin, 'case-record');
        if (difficulty === 'easy') {
          const before = calls;
          assert.deepEqual(await (await interrogate(request('interrogate', id, query, requestId))).json(), data);
          assert.equal(calls, before);
          allowedRecord = true;
          assert.equal((await interrogate(request('interrogate', id, { playerQuestion: 'What does the witness record say about handling the ledger?' }))).status, 200);
          assert.equal(getSession(id)!.clues.length, 1);
        }
      }
    }
    assert.equal(getSession(id)!.acceptedTurns!.filter(turn => turn.addedClueIds.length).length, 1);
    assert.equal(inspectDisclosure(getSession(id)!, facts.the_truth), 'allowed');
    judging = true;
    const verdict = await accuse(request('accuse', id, { accusation: 'You denied handling the ledger, but Pat’s witness record identifies you holding it.' }));
    assert.equal(verdict.status, 200); assert.equal((await verdict.json()).correct, true);
  }
});

test('blocked responses, opening actions, brief repeats and accusations do not manufacture release progress', async t => {
  await generationFixture(t);
  const id = createSession(facts, [], 0, 'unlimited'); t.after(() => deleteSession(id));
  const session = getSession(id)!; beginSession(session);
  commitTurn(session, '*Detective enters*', response);
  commitTurn(session, 'Why?', response);
  commitTurn(session, 'Tell me about the witness record.', response);
  commitTurn(session, 'Tell me about the witness record!', response);
  commitTurn(session, 'Who signed the witness record?', response);
  const blocked = commitTurn(session, 'When was the witness record made?', { ...response, spoken_response: facts.the_truth });
  assert.equal(blocked.clues.length, 0); assert.equal(blocked.clue_unlocked, null);
  assert.equal(session.conversationHistory.at(-1)!.content, blocked.spoken_response);
  session.conversationHistory.push({ role: 'user', kind: 'accusation', content: 'A completely separate accusation must not count.' });
  assert.equal(recordReleaseProgress(session.conversationHistory, 'easy').asked, 3);
  const released = commitTurn(session, 'Where can I compare that witness record?', response);
  assert.equal(released.clues.length, 1);
});

test('authored actor sees disclosed exhibits; direct callers and legacy full-quota sessions keep private facts out', async t => {
  await generationFixture(t);
  const id = createSession(authoredCaseData()); t.after(() => deleteSession(id));
  const session = getSession(id)!; attachAuthoredGameplay(session);
  const context = actorCase(session);
  const prompt = buildSuspectPrompt({ caseData: context, questionCount: 1, currentStress: 0 });
  assert.match(prompt, /signed entry/); assert.ok(!prompt.includes('ledger was later found'));
  assert.ok(!('the_truth' in context)); assert.ok(!('suspect_true_story' in context));
  const direct = buildSuspectPrompt({ caseData: facts, questionCount: 1, currentStress: 0 });
  assert.ok(!direct.includes(facts.the_truth)); assert.ok(!direct.includes(facts.the_contradiction));
  const legacyId = createSession(facts, [], 0, 'unlimited'); t.after(() => deleteSession(legacyId));
  const legacy = getSession(legacyId)!; beginSession(legacy);
  legacy.clues = [{ id: 'clue-1', text: 'Old note one' }, { id: 'clue-2', text: 'Old note two' }];
  legacy.cluesCollected = 2;
  for (const question of ['Explain the original witness record.', 'Which record did the witness sign?', 'What does that signed record establish?']) {
    commitTurn(legacy, question, response);
  }
  assert.equal(legacy.clues.length, 3); assert.equal(legacy.clues[2].origin, 'case-record');
  assert.equal(legacy.clues[0].text, 'Old note one');
});
