import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { GET as status } from '../app/api/session/route';
import { POST as end } from '../app/api/session/end/route';
import { persistenceFixture } from './session-persistence-fixtures';
import { beginSession } from '../src/lib/session/transitions';
import { persistSession } from '../src/lib/session/store';

void test('actual session resume endpoint only projects safe case fields and known progress', async context => {
  const fixture = await persistenceFixture(context);
  fixture.session.caseData.unexpected_secret = 'Must not leak';
  fixture.session.questionsAsked = 2;
  persistSession(fixture.sessionId);
  const response = await status(new NextRequest(`http://localhost/api/session?sessionId=${fixture.sessionId}`));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.caseData.sessionId, fixture.sessionId);
  assert.equal(body.questionsAsked, 2);
  assert.equal(body.result, undefined);
  assert.equal(body.winToken, undefined);
  assert.equal('the_truth' in body.caseData, false);
  assert.equal('unexpected_secret' in body.caseData, false);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

void test('explicit give-up is idempotent, terminal and recoverable through status', async context => {
  const fixture = await persistenceFixture(context);
  const request = () => new NextRequest('http://localhost/api/session/end', {
    method: 'POST', body: JSON.stringify({ sessionId: fixture.sessionId, requestId: 'give-up-once', reason: 'giveup' }),
  });
  const first = await end(request());
  const body = await first.json();
  assert.equal(first.status, 200);
  assert.equal(body.outcome, 'lose_giveup');
  assert.equal(body.export.state, 'saved');
  assert.deepEqual(await (await end(request())).json(), body);
  const recovered = await (await status(new NextRequest(`http://localhost/api/session?sessionId=${fixture.sessionId}`))).json();
  assert.equal(recovered.result.outcome, 'lose_giveup');
  assert.equal(recovered.result.the_truth_revealed, 'Secret truth');
});

void test('an early client time-expiry request cannot terminate a live game', async context => {
  const fixture = await persistenceFixture(context);
  beginSession(fixture.session);
  const response = await end(new NextRequest('http://localhost/api/session/end', { method: 'POST',
    body: JSON.stringify({ sessionId: fixture.sessionId, requestId: 'early-time-1', reason: 'time' }) }));
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, 'DEADLINE_NOT_REACHED');
  assert.equal(fixture.session.outcome, null);
});

void test('mutations without a stable request ID fail before changing the session', async context => {
  const fixture = await persistenceFixture(context);
  const { POST: accuse } = await import('../app/api/accuse/route');
  const { POST: interrogate } = await import('../app/api/interrogate/route');
  const { POST: hint } = await import('../app/api/hint/route');
  const cases = [
    { route: end, body: { reason: 'giveup' } },
    { route: accuse, body: { accusation: 'The access log contradicts your alibi.' } },
    { route: interrogate, body: { playerQuestion: 'Where were you at nine?' } },
    { route: hint, body: {} },
  ];
  for (const item of cases) {
    const response = await item.route(new NextRequest('http://localhost/api/test', { method: 'POST',
      body: JSON.stringify({ sessionId: fixture.sessionId, ...item.body }) }));
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, 'INVALID_REQUEST_ID');
  }
  assert.equal(fixture.session.outcome, null);
  assert.equal(fixture.session.questionsAsked, 0);
  assert.equal(fixture.session.hintsUsed, 0);
  assert.equal(fixture.session.accusationsUsed, 0);
});
