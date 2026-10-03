import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { NextRequest } from 'next/server';
import { POST } from '../app/api/patterns/route';
import { canonicalPattern, summarizePatterns, type CanonicalPattern } from '../src/lib/ai/retrieval/patterns';
import { storeSessionPattern } from '../src/lib/ai/retrieval/service';
import { createSession, getSession, deleteSession } from '../src/lib/session/store';
import { beginSession, commitAccusation, finishSession } from '../src/lib/session/transitions';
import { commitTurn } from '../src/lib/session/turn';
import { exportSession } from '../src/lib/session/export';
import { generationFixture } from './generation-fixtures';

const questions = ['What does the visitor statement record?', 'Who signed that visitor statement?', 'Which time appears in the signed visitor statement?'];
const provenance = { provider: 'controlled', model: 'fixture-only', capability: 'suspect' as const, promptHash: 'a'.repeat(64) };

test('only finalized wins select accepted evidence events; unfinished and loss records cannot claim success', async context => {
  const directory = await generationFixture(context);
  const prior = { AI_RAG_ENABLED: process.env.AI_RAG_ENABLED, EXPORT_STORAGE: process.env.EXPORT_STORAGE };
  process.env.AI_RAG_ENABLED = 'true'; process.env.EXPORT_STORAGE = 'local';
  context.after(() => { for (const [key, value] of Object.entries(prior)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  } });
  context.mock.method(globalThis, 'fetch', async () => { throw new Error('This acceptance check must not perform network work'); });
  const saved: CanonicalPattern[] = []; let placeholderCalls = 0;
  const dependencies = { embed: async () => { placeholderCalls++; return Array(1536).fill(0); },
    save: async (pattern: CanonicalPattern) => { saved.push(structuredClone(pattern)); } };
  for (const outcome of ['win', 'lose_giveup'] as const) {
    const id = createSession({ setting: 'Controlled office', difficulty: 'easy', playMode: 'relaxed',
      suspect_name: 'Ada', suspect_cover_story: 'I was not there.',
      the_contradiction: 'A personally recognizing witness saw Ada in the office at noon.' }, [], 0, 'unlimited');
    context.after(() => deleteSession(id));
    const session = getSession(id)!;
    const spoof = () => POST(new NextRequest('http://localhost/api/patterns', { method: 'POST',
      body: JSON.stringify({ sessionId: id, outcome: 'win', difficulty: 'expert', effectiveQuestions: ['Invented success'] }) }));
    assert.equal((await spoof()).status, 409);
    await assert.rejects(storeSessionPattern(session, dependencies), { code: 'SESSION_UNFINISHED' });
    beginSession(session);
    questions.forEach((question, index) => commitTurn(session, question, { spoken_response: 'My account stands.',
      stress_level: index + 1, clue_unlocked: 'Invented model clue must not count.', _aiProvenance: provenance }));
    assert.equal((await spoof()).status, 409, 'accepted turns alone are not a confirmed win');
    if (outcome === 'win') commitAccusation(session, 'Your absence claim conflicts with the witness.', { correct: true, explanation: 'Controlled accepted judgment.' });
    else finishSession(session, outcome);
    await storeSessionPattern(session, dependencies);
    const pattern = saved.at(-1)!;
    assert.equal(pattern.outcome, outcome); assert.equal(pattern.difficulty, 'easy');
    assert.equal(pattern.turn_events.length, 3); assert.equal(pattern.question_evidence.length, 1);
    assert.equal(pattern.question_evidence[0].question, questions[2]);
    assert.equal(pattern.question_evidence[0].turnId, 'accepted-turn:4');
    assert.deepEqual(pattern.question_evidence[0].clueIds, ['clue-1']);
    assert.deepEqual(pattern.turn_events.map(event => [event.stressBefore, event.stressAfter]), [[0, 1], [1, 2], [2, 3]]);
    assert.deepEqual(pattern.turn_events[2].provenance, provenance);
    assert.deepEqual(canonicalPattern(session), pattern, 'repeated canonical snapshot is stable');
    assert.deepEqual(summarizePatterns([pattern]).tactics, outcome === 'win' ? [questions[2].toLowerCase()] : []);
    session.acceptedTurns!.push({ ...session.acceptedTurns![2], timestamp: -1, question: 'Forged unsupported event' });
    assert.deepEqual(canonicalPattern(session).question_evidence, pattern.question_evidence, 'orphan event metadata is not a source');
    if (outcome === 'win') {
      await exportSession(id, outcome, 'Forged client accusation', false);
      const path = join(directory, 'exports', `${id}.json`); const first = await readFile(path, 'utf8');
      await exportSession(id, outcome, 'Changed metadata', false);
      assert.equal(await readFile(path, 'utf8'), first);
      const exported = JSON.parse(first);
      assert.equal(exported.record.outcome, 'win'); assert.equal(exported.record.difficulty, 'easy');
      assert.equal(exported.record.accusation_text, session.acceptedAccusation!.text);
      assert.equal((await readdir(join(directory, 'exports'))).filter(name => name.endsWith('.json')).length, 1);
    }
  }
  assert.equal(placeholderCalls, 2, 'only the two finalized sessions reach the injected placeholder');
  assert.equal(saved.length, 2); assert.deepEqual(summarizePatterns(saved).tactics, [questions[2].toLowerCase()]);
  context.diagnostic('No network or embedding API: one canonical winning example; loss and stress-only turns excluded; unfinished spoof rejected; repeated local export byte-identical.');
});
