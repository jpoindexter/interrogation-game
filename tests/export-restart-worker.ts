import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { POST as end } from '../app/api/session/end/route';
import { POST as evaluate } from '../app/api/evaluate/route';
import { createSession, getSession, persistSession } from '../src/lib/session/store';
import { readExport } from '../src/lib/session/exports/storage';

const [operation, recoveredId] = process.argv.slice(2);
const nativeFetch = globalThis.fetch;
let calls = 0;
globalThis.fetch = async (input, options) => {
  calls++;
  if (operation === 'local') throw new Error('Local-only completion must never fetch');
  const target = new URL(input instanceof Request ? input.url : String(input));
  assert.equal(target.origin, 'https://export-restart-fixture.supabase.co');
  assert.equal(target.pathname, '/rest/v1/game_exports');
  return nativeFetch(`${process.env.EXPORT_FIXTURE_URL}${target.pathname}${target.search}`, options);
};

function request(path: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost/api/${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}
function newSession() {
  const id = createSession({ case_number: 'export-fixture', setting: 'office', difficulty: 'easy',
    suspect_name: 'Fixture', suspect_gender: 'nonbinary', suspect_role: 'Archivist',
    crime: 'Missing ledger', briefing: 'A synthetic export case.', objective: 'Compare accounts.',
    suspect_cover_story: 'I left at six.', the_lie: 'Left at six', the_truth: 'Returned at seven',
    the_contradiction: 'The signed ledger records a seven oclock return.' }, [], 0, 'unlimited');
  const session = getSession(id)!;
  session.status = 'active'; session.startTime = Date.now() - 1000;
  session.questionsAsked = 1;
  session.conversationHistory.push({ role: 'user', content: 'When did you leave the archive?' },
    { role: 'assistant', content: 'I left at six.' });
  persistSession(id);
  return id;
}
async function main() {
  const id = operation === 'resume' ? recoveredId : newSession();
  if (operation !== 'resume') {
    const response = await end(request('session/end', { sessionId: id, requestId: 'export-end-fixture', reason: 'giveup' }));
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.outcome, 'lose_giveup');
    assert.equal(result.export.state, operation === 'local' ? 'saved' : 'pending');
  } else {
    assert.equal(getSession(id)!.outcome, 'lose_giveup', 'terminal state survived shutdown');
    assert.equal(readExport(id)!.delivery.state, 'pending');
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await evaluate(request('evaluate', { sessionId: id, type: 'lose' }));
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.outcome, 'lose_giveup');
      assert.equal(result.export.state, 'saved');
    }
  }
  process.send?.({ id, pid: process.pid, calls, delivery: readExport(id)!.delivery });
  if (operation !== 'outage') process.disconnect?.();
  // The outage worker deliberately waits for the parent's real SIGKILL after its pending receipt.
}
void main().catch(() => { process.send?.({ error: 'Export restart worker assertion failed' }); process.exitCode = 1; process.disconnect?.(); });
