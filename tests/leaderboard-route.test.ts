import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { GET, POST } from '../app/api/leaderboard/route';
import { leaderboardFixture } from './leaderboard-fixtures';

void test('actual leaderboard routes persist a win locally and expose its exact record id', async context => {
  const fixture = await leaderboardFixture(context);
  const keys = ['LEADERBOARD_STORAGE', 'INTERROGATION_DATA_DIR', 'VERCEL'] as const;
  const previous = keys.map(key => process.env[key]);
  context.after(() => keys.forEach((key, index) => {
    if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index];
  }));
  process.env.LEADERBOARD_STORAGE = 'local';
  process.env.INTERROGATION_DATA_DIR = fixture.directory;
  delete process.env.VERCEL;
  const post = await POST(new NextRequest('http://localhost/api/leaderboard', {
    method: 'POST', body: JSON.stringify(fixture.body), headers: { 'Content-Type': 'application/json' },
  }));
  assert.equal(post.status, 200);
  const receipt = await post.json();
  const listing = await GET(new NextRequest('http://localhost/api/leaderboard'));
  assert.equal(listing.status, 200);
  const payload = await listing.json();
  assert.equal(payload.leaderboard.length, 1);
  assert.equal(payload.leaderboard[0].id, receipt.id);
  assert.equal(payload.leaderboard[0].score, receipt.score);
  assert.equal('redemption_hash' in payload.leaderboard[0], false);
});
