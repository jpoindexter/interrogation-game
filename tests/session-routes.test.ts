import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NextRequest } from 'next/server';
import { POST as evaluate } from '../app/api/evaluate/route';
import { POST as accuse } from '../app/api/accuse/route';
import { POST as interrogate } from '../app/api/interrogate/route';
import { createSession, getSession, deleteSession, acquireSessionLock, releaseSessionLock } from '../src/lib/session/store';
import { beginSession, acceptClue, finishSession } from '../src/lib/session/transitions';

function request(route: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost/api/${route}`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
    body: JSON.stringify({ requestId: randomUUID(), ...body }),
  });
}

test('actual evaluation route refuses invented win and retains session', async () => {
  const id = createSession({ difficulty: 'easy', the_truth: 'private' });
  const response = await evaluate(request('evaluate', { sessionId: id, type: 'win' }));
  assert.equal(response.status, 409);
  assert.ok(getSession(id));
  assert.ok(!JSON.stringify(await response.json()).includes('private'));
  deleteSession(id);
});

test('actual accusation route refuses expired session without model call', async () => {
  const id = createSession({ difficulty: 'easy' });
  const session = getSession(id)!;
  beginSession(session, Date.now() - 301000);
  acceptClue(session, 'Access log');
  acceptClue(session, 'Witness account');
  const response = await accuse(request('accuse', { sessionId: id, accusation: 'You lied about the access log' }));
  assert.equal(response.status, 409);
  assert.equal(session.accusationsLeft, 3);
  assert.equal(session.outcome, 'lose_time');
  deleteSession(id);
});

test('actual routes honor shared session lock', async () => {
  const id = createSession({ difficulty: 'easy' });
  acquireSessionLock(id);
  const results = await Promise.all([
    evaluate(request('evaluate', { sessionId: id, type: 'lose' })),
    interrogate(request('interrogate', { sessionId: id, playerQuestion: 'Where were you last night?' })),
    accuse(request('accuse', { sessionId: id, accusation: 'Your alibi was false' })),
  ]);
  assert.deepEqual(results.map(response => response.status), [409, 409, 409]);
  releaseSessionLock(id);
  deleteSession(id);
});

test('actual interrogation route cannot continue a won session', async () => {
  const id = createSession({ difficulty: 'easy' });
  const session = getSession(id)!;
  beginSession(session);
  finishSession(session, 'win');
  const response = await interrogate(request('interrogate', { sessionId: id, playerQuestion: 'Tell me another story' }));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.outcome, 'win');
  assert.equal(session.conversationHistory.length, 0);
  deleteSession(id);
});
