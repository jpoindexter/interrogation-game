import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { NextRequest } from 'next/server';
import { POST as generate } from '../app/api/generate-case/route';
import { POST as interrogate } from '../app/api/interrogate/route';
import { POST as gameplay } from '../app/api/gameplay/route';
import { POST as accuse } from '../app/api/accuse/route';
import { GET as resume } from '../app/api/session/route';
import { deleteSession, getSession } from '../src/lib/session/store';

function request(route: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost/api/${route}`, { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify({ requestId: randomUUID(), ...body }) });
}

test('authored case plays through real routes: wrong exhibit, exact replay, contradiction, recovery, win', async () => {
  const originalFetch = globalThis.fetch;
  const oldProvider = process.env.AI_PROVIDER;
  const oldKey = process.env.OPENAI_API_KEY;
  process.env.AI_PROVIDER = 'openai'; process.env.OPENAI_API_KEY = 'test-only';
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    const payload = JSON.parse(String(init?.body));
    const answer = payload.text.format.name.includes('judge')
      ? { correct: true, confession: 'I returned later that evening.', explanation: 'The signed arrival contradicts the claim of no return.' }
      : { spoken_response: 'That record needs some context, detective.', internal_state: 'Defensive', stress_level: 2, clue_unlocked: null, caught: false };
    return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(answer) }] }] });
  };
  let sessionId = '';
  try {
    const created = await generate(request('generate-case', { mode: 'redteam', difficulty: 'easy' }));
    assert.equal(created.status, 200);
    const data = await created.json(); sessionId = data.sessionId;
    assert.equal(data.requiredClues, 1);
    assert.equal(data.the_truth, undefined);
    assert.equal(data.gameplay.exhibits.length, 2);
    const opening = await interrogate(request('interrogate', { sessionId, playerQuestion: '*Detective sits down*' }));
    const first = await opening.json();
    assert.equal(calls, 0, 'Authored opening is explicitly scripted');
    const pinned = await gameplay(request('gameplay', { sessionId, kind: 'pin', turnId: first.gameplay.turns[0].id, quote: first.spoken_response }));
    const { statement } = await pinned.json();
    assert.equal(statement.claimId, undefined);
    const action = { id: randomUUID(), kind: 'present_evidence', statementId: statement.id, exhibitId: 'badge-record', question: 'How does this record fit your account?' };
    const body = { sessionId, requestId: action.id, kind: 'action', action };
    const wrong = await (await gameplay(request('gameplay', body))).json();
    assert.equal(wrong.result.status, 'not_established'); assert.equal(wrong.clues.length, 0);
    const replay = await (await gameplay(request('gameplay', body))).json();
    assert.deepEqual(replay, wrong); assert.equal(calls, 1);
    const blocked = await accuse(request('accuse', { sessionId, accusation: 'Your return story is false.' }));
    assert.equal(blocked.status, 409); assert.equal(calls, 1);
    const correct = { ...action, id: randomUUID(), exhibitId: 'visitor-log' };
    const established = await (await gameplay(request('gameplay', { sessionId, requestId: correct.id, kind: 'action', action: correct }))).json();
    assert.equal(established.result.status, 'contradiction_established'); assert.equal(established.clues.length, 1);
    const recovered = await (await resume(new NextRequest(`http://localhost/api/session?sessionId=${sessionId}`))).json();
    assert.equal(recovered.gameplay.establishedCount, 1); assert.equal(recovered.caseData.requiredClues, 1);
    const won = await (await accuse(request('accuse', { sessionId, accusation: 'You said you never returned after six, but your signed arrival is 18:42.' }))).json();
    assert.equal(won.correct, true); assert.equal(won.outcome, 'win');
    assert.equal(getSession(sessionId)?.gameplay?.status, 'ended');
    assert.equal(calls, 3);
  } finally {
    if (sessionId) deleteSession(sessionId);
    globalThis.fetch = originalFetch;
    if (oldProvider === undefined) delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER = oldProvider;
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = oldKey;
  }
});
