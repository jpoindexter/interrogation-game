import assert from 'node:assert/strict';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { redeemWin } from '../src/lib/leaderboard/redemption';
import { LocalLeaderboardStore } from '../src/lib/leaderboard/local-store';
import { inspectWinToken, issueWinToken } from '../src/lib/session/tokens';
import { leaderboardFixture } from './leaderboard-fixtures';

void test('failed persistence leaves win redeemable and retry returns canonical frozen metadata', async context => {
  const fixture = await leaderboardFixture(context);
  const failedStore = { find: fixture.store.find.bind(fixture.store), list: fixture.store.list.bind(fixture.store),
    insert: async () => { throw new Error('Disk unavailable'); } };
  await assert.rejects(redeemWin(fixture.body, failedStore), /Disk unavailable/);
  const snapshot = inspectWinToken(fixture.body.sessionId, fixture.body.winToken)!;
  assert.ok(snapshot);
  fixture.session.caseData.suspect_name = 'Changed after token issuance';
  const receipt = await redeemWin({ ...fixture.body, score: 999999, suspectName: 'Forged', cluesFound: 99 }, fixture.store);
  const saved = await fixture.store.find(fixture.body.sessionId);
  assert.equal(receipt.score, snapshot.stats.score);
  assert.equal(saved?.suspect_name, 'Ada');
  assert.equal(saved?.clues_found, 3);
  assert.equal(saved?.stress_level, 7);
  assert.equal(inspectWinToken(fixture.body.sessionId, fixture.body.winToken), null);
  assert.equal(issueWinToken(fixture.body.sessionId), null);
});

void test('concurrent duplicate redemptions persist one record and replay the same receipt', async context => {
  const fixture = await leaderboardFixture(context);
  const secondStore = new LocalLeaderboardStore(fixture.storagePath);
  const receipts = await Promise.all([
    redeemWin(fixture.body, fixture.store), redeemWin(fixture.body, secondStore), redeemWin(fixture.body, fixture.store),
  ]);
  assert.deepEqual(receipts[0], receipts[1]);
  assert.deepEqual(receipts[0], receipts[2]);
  const repeat = await redeemWin({ ...fixture.body, playerName: 'XYZ' }, new LocalLeaderboardStore(fixture.storagePath));
  assert.deepEqual(repeat, receipts[0]);
  assert.equal(repeat.playerName, 'ABC');
  assert.equal((await readdir(fixture.storagePath)).filter(file => file.endsWith('.json')).length, 1);
  if (process.platform !== 'win32') {
    assert.equal((await stat(fixture.storagePath)).mode & 0o777, 0o700);
    assert.equal((await stat(join(fixture.storagePath, `${fixture.body.sessionId}.json`))).mode & 0o777, 0o600);
  }
});

void test('a lost confirmation can be retried after the record was committed', async context => {
  const fixture = await leaderboardFixture(context);
  const uncertainStore = { find: fixture.store.find.bind(fixture.store), list: fixture.store.list.bind(fixture.store),
    insert: async (row: Parameters<typeof fixture.store.insert>[0]) => {
      await fixture.store.insert(row); throw new Error('Response lost after commit');
    } };
  await assert.rejects(redeemWin(fixture.body, uncertainStore), /Response lost/);
  const receipt = await redeemWin(fixture.body, fixture.store, { inspect: () => null, consume: () => false });
  assert.equal(receipt.success, true);
  assert.equal((await fixture.store.list()).length, 1);
});

void test('an incorrect token cannot retrieve or replace an existing receipt', async context => {
  const fixture = await leaderboardFixture(context);
  await redeemWin(fixture.body, fixture.store);
  await assert.rejects(redeemWin({ ...fixture.body, winToken: '0'.repeat(32) }, fixture.store), /Invalid or expired/);
  assert.equal((await fixture.store.list()).length, 1);
});
