import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { POST as generate } from '../app/api/generate-case/route';
import { POST as speak } from '../app/api/tts/route';
import { GET as leaderboard } from '../app/api/leaderboard/route';

test('HTTP distinguishes exhausted budget from unavailable storage before provider work', async () => {
  const previous = process.env.INTERROGATION_DATA_DIR;
  const directory = mkdtempSync(join(tmpdir(), 'budget-http-'));
  process.env.INTERROGATION_DATA_DIR = directory;
  const request = () => new NextRequest('http://localhost/api/generate-case', { method: 'POST', body: 'not-json' });
  try {
    for (let index = 0; index < 10; index++) assert.equal((await generate(request())).status, 400);
    const exhausted = await generate(request());
    assert.equal(exhausted.status, 429);
    assert.equal(exhausted.headers.get('Retry-After'), '60');
    assert.equal((await exhausted.json()).code, 'RATE_LIMITED');
    const file = join(directory, 'not-a-directory');
    writeFileSync(file, 'unavailable');
    process.env.INTERROGATION_DATA_DIR = file;
    for (const response of [await generate(request()),
      await speak(new NextRequest('http://localhost/api/tts', { method: 'POST', body: '{}' })),
      await leaderboard(new NextRequest('http://localhost/api/leaderboard'))]) {
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), {
        error: 'Request budget storage is unavailable. Retry the same request shortly.', code: 'BUDGET_UNAVAILABLE',
      });
    }
  } finally {
    if (previous === undefined) delete process.env.INTERROGATION_DATA_DIR;
    else process.env.INTERROGATION_DATA_DIR = previous;
    rmSync(directory, { recursive: true, force: true });
  }
});
