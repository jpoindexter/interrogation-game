import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { redeemWin } from '../src/lib/leaderboard/redemption';
import { LocalLeaderboardStore } from '../src/lib/leaderboard/local-store';
import { inspectWinToken } from '../src/lib/session/tokens';

async function main() {
  const operation = process.argv[2];
  const directory = process.env.INTERROGATION_DATA_DIR!;
  const body = JSON.parse(await readFile(join(directory, 'submission.json'), 'utf8'));
  const store = new LocalLeaderboardStore(join(directory, 'records'));
  if (operation === 'fail') {
    const blocked = join(directory, 'blocked-destination');
    await writeFile(blocked, 'A file cannot serve as the destination directory.', { mode: 0o600 });
    const failedStore = { find: store.find.bind(store), list: store.list.bind(store),
      insert: (row: Parameters<typeof store.insert>[0]) => new LocalLeaderboardStore(blocked).insert(row) };
    try { await redeemWin(body, failedStore); throw new Error('Expected a filesystem failure'); }
    catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'UNEXPECTED';
      if (code !== 'EEXIST') throw new Error('Expected EEXIST from the blocked destination');
      process.stdout.write(JSON.stringify({ pid: process.pid, failure: code,
        tokenValid: Boolean(inspectWinToken(body.sessionId, body.winToken)), rows: (await store.list()).length }));
      process.exitCode = 23; return;
    }
  }
  const receipt = await redeemWin(body, store);
  const changedSubmissionReceipt = operation === 'repeat' ? await redeemWin({ ...body, playerName: 'XYZ', score: 999999 }, store) : null;
  const row = await store.find(body.sessionId);
  const bytes = await readFile(join(directory, 'records', `${body.sessionId}.json`));
  process.stdout.write(JSON.stringify({ pid: process.pid, receipt, changedSubmissionReceipt, rows: (await store.list()).length,
    rowHash: createHash('sha256').update(bytes).digest('hex'), tokenValid: Boolean(inspectWinToken(body.sessionId, body.winToken)),
    metadata: { suspect: row?.suspect_name, clues: row?.clues_found, stress: row?.stress_level, player: row?.player_name } }));
}
void main().catch(() => { process.stderr.write('Restart worker failed without publishing private submission data.'); process.exitCode = 1; });
