import assert from 'node:assert/strict';
import test from 'node:test';
import { ResultClient } from '../app/game/result/result-client';
import { evaluation, result, resultFixture } from './result-fixtures';

void test('concurrent debrief consumers and a refreshed page reuse one canonical response', async context => {
  let requests = 0;
  const fixture = await resultFixture(context, (_request, response) => {
    requests++;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(evaluation));
  });
  const [first, second] = await Promise.all([fixture.client.evaluate(result, 'win'), fixture.client.evaluate(result, 'win')]);
  assert.deepEqual(first, evaluation);
  assert.deepEqual(second, evaluation);
  const refreshed = new ResultClient(fixture.environment);
  assert.deepEqual(await refreshed.evaluate(result, 'win'), evaluation);
  assert.equal(requests, 1);
});

void test('failed debrief remains retryable and never caches invented facts', async context => {
  let requests = 0;
  const fixture = await resultFixture(context, (_request, response) => {
    requests++;
    response.writeHead(requests === 1 ? 503 : 200);
    response.end(JSON.stringify(requests === 1 ? { error: 'offline' } : evaluation));
  });
  await assert.rejects(fixture.client.evaluate(result, 'win'), /HTTP 503/);
  assert.equal(fixture.storage.getItem('evaluation:v1:session-1:win'), null);
  assert.deepEqual(await fixture.client.evaluate(result, 'win'), evaluation);
  assert.equal(requests, 2);
});

void test('score save requires confirmed success and retry sends auth headers', async context => {
  let requests = 0;
  const receipt = { success: true, id: 'record-32', score: 876, playerName: 'ABC' };
  const fixture = await resultFixture(context, (request, response) => {
    requests++;
    assert.equal(request.headers['x-test-provider'], 'synthetic');
    response.writeHead(requests === 1 ? 500 : 200);
    response.end(JSON.stringify(requests === 1 ? { error: 'Write failed' } : receipt));
  });
  await assert.rejects(fixture.client.submit(result, 'ABC'), /HTTP 500/);
  assert.equal(fixture.storage.getItem('leaderboard:v1:session-1'), null);
  const [first, second] = await Promise.all([fixture.client.submit(result, 'ABC'), fixture.client.submit(result, 'ABC')]);
  assert.deepEqual(first, receipt);
  assert.deepEqual(second, receipt);
  assert.equal(requests, 2);
  assert.deepEqual(await new ResultClient(fixture.environment).submit(result, 'DEF'), receipt);
  assert.equal(requests, 2);
});

void test('HTTP success with an error-shaped body cannot become Recorded', async context => {
  const fixture = await resultFixture(context, (_request, response) => response.end('{"error":"not saved"}'));
  await assert.rejects(fixture.client.submit(result, 'ABC'), /did not confirm/);
  assert.equal(fixture.storage.getItem('leaderboard:v1:session-1'), null);
});

void test('a mismatched canonical outcome is rejected', async context => {
  const fixture = await resultFixture(context, (_request, response) => response.end(JSON.stringify({ ...evaluation, outcome: 'lose_time' })));
  await assert.rejects(fixture.client.evaluate(result, 'win'), /incomplete result/);
});
