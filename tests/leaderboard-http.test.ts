import assert from 'node:assert/strict';
import test from 'node:test';
import { leaderboardGet, leaderboardPost } from '../src/lib/leaderboard/http';
import { leaderboardFixture } from './leaderboard-fixtures';

void test('HTTP save and read expose confirmed id and score but no private redemption data', async context => {
  const fixture = await leaderboardFixture(context);
  const makeContext = (request: Request) => ({ request, store: () => fixture.store, allowed: () => true });
  const post = await leaderboardPost(makeContext(new Request('http://localhost/api/leaderboard', {
    method: 'POST', body: JSON.stringify(fixture.body),
  })));
  assert.equal(post.status, 200);
  const receipt = await post.json();
  assert.equal(receipt.success, true);
  const get = await leaderboardGet(makeContext(new Request('http://localhost/api/leaderboard')));
  const payload = await get.json();
  assert.equal(payload.leaderboard[0].id, receipt.id);
  assert.equal(payload.leaderboard[0].score, receipt.score);
  assert.equal('redemption_hash' in payload.leaderboard[0], false);
  assert.equal('session_id' in payload.leaderboard[0], false);
  assert.equal(JSON.stringify(payload).includes(fixture.body.winToken), false);
});

void test('HTTP malformed input and unavailable storage never return false save success', async context => {
  const fixture = await leaderboardFixture(context);
  const malformed = await leaderboardPost({ allowed: () => true, store: () => fixture.store,
    request: new Request('http://localhost/api/leaderboard', { method: 'POST', body: 'not json' }) });
  assert.equal(malformed.status, 400);
  const unavailable = await leaderboardPost({ allowed: () => true, store: () => { throw new Error('Not configured'); },
    request: new Request('http://localhost/api/leaderboard', { method: 'POST', body: JSON.stringify(fixture.body) }) });
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.json()).success, undefined);
});
