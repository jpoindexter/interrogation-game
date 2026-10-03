import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { GET as exportGet } from '../app/api/export/route';
import { createSession, getSession } from '../src/lib/session/store';
import { finishSession } from '../src/lib/session/transitions';
import { exportSession } from '../src/lib/session/export';
import { persistenceFixture } from './session-persistence-fixtures';
import { syntheticSecret } from './export-fixtures';

test('actual private export route rejects wrong credentials and pages filtered durable records', async context => {
  const fixture = await persistenceFixture(context);
  const previous = process.env.EXPORT_SECRET;
  process.env.EXPORT_SECRET = syntheticSecret;
  context.after(() => { if (previous === undefined) delete process.env.EXPORT_SECRET; else process.env.EXPORT_SECRET = previous; });
  const ids = [fixture.sessionId, createSession(fixture.session.caseData), createSession({ ...fixture.session.caseData, difficulty: 'hard' })];
  for (const [index, id] of ids.entries()) {
    finishSession(getSession(id)!, 'lose_giveup', Date.now() + index * 1000);
    await exportSession(id, 'lose_giveup');
  }
  for (const authorization of ['', 'Bearer wrong-export-secret', `Basic ${syntheticSecret}`]) {
    const response = await exportGet(new NextRequest('http://localhost/api/export', { headers: { authorization } }));
    assert.equal(response.status, 401);
    assert.equal((await response.text()).includes('Secret truth'), false);
  }
  const response = await exportGet(new NextRequest('http://localhost/api/export?difficulty=medium&offset=1&limit=1', {
    headers: { authorization: `Bearer ${syntheticSecret}` },
  }));
  assert.equal(response.status, 200);
  const rows = (await response.text()).trim().split('\n').map(line => JSON.parse(line));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].session_id, fixture.sessionId);
  assert.equal(rows[0].difficulty, 'medium');
});
