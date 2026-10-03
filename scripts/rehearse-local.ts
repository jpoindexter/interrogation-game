import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

const origin = process.env.REHEARSAL_ORIGIN ?? 'http://127.0.0.1:3187';
if (new URL(origin).hostname !== '127.0.0.1') throw new Error('Rehearsal is restricted to the local demo server.');
const timings: { route: string; milliseconds: number; status: number }[] = [];
async function call(route: string, body?: Record<string, unknown>) {
  const start = performance.now();
  const response = await fetch(`${origin}/api/${route}`, { cache: 'no-store', signal: AbortSignal.timeout(120000),
    ...(body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ requestId: randomUUID(), ...body }) } : {}),
  });
  timings.push({ route: route.split('?')[0], milliseconds: Math.round(performance.now() - start), status: response.status });
  const data = await response.json();
  if (!response.ok) throw new Error(`${route.split('?')[0]}: HTTP ${response.status} ${data.code ?? ''}`);
  return data;
}

async function rehearse() {
  const health = await call('health');
  assert.equal(health.services.ai.provider, 'codex-local');
  const created = await call('generate-case', { mode: 'redteam', difficulty: 'easy' });
  const sessionId = created.sessionId;
  const opening = await call('interrogate', { sessionId, playerQuestion: '*Detective sits down and opens the file*' });
  const pinned = await call('gameplay', { sessionId, kind: 'pin', turnId: opening.gameplay.turns[0].id, quote: opening.spoken_response });
  const base = { kind: 'present_evidence', statementId: pinned.statement.id, question: 'Please explain how your account fits this record.' };
  const wrongAction = { ...base, id: randomUUID(), exhibitId: 'badge-record' };
  const wrongEvidence = await call('gameplay', { sessionId, requestId: wrongAction.id, kind: 'action', action: wrongAction });
  assert.equal(wrongEvidence.result.status, 'not_established');
  const rightAction = { ...base, id: randomUUID(), exhibitId: 'visitor-log' };
  const rightEvidence = await call('gameplay', { sessionId, requestId: rightAction.id, kind: 'action', action: rightAction });
  assert.equal(rightEvidence.result.status, 'contradiction_established');
  const wrongAccusation = await call('accuse', { sessionId, accusation: 'You lied about being an operations analyst. You actually work as a security guard.' });
  assert.equal(wrongAccusation.correct, false);
  const win = await call('accuse', { sessionId, accusation: 'You claimed you left at six and never returned, but the signed visitor record names you arriving at 18:42. Your claim of no return was false; the record proves presence, not theft.' });
  assert.equal(win.correct, true);
  const result = await call('evaluate', { sessionId, type: 'win' });
  assert.equal(result.correct, true);
  assert.deepEqual(result.conversationPath.map((node: { status: string }) => node.status),
    ['neutral', 'unsupported', 'supported', 'unsupported', 'supported']);
  const recovered = await call(`session?sessionId=${sessionId}`);
  assert.equal(recovered.outcome, 'win');
  assert.equal(recovered.gameplay.status, 'ended');
  return { opening: opening.spoken_response, wrongEvidence: wrongEvidence.result, rightEvidence: rightEvidence.result,
    wrongAccusation, win, result, recoveredOutcome: recovered.outcome };
}

async function rehearseLoss() {
  const created = await call('generate-case', { mode: 'redteam', playMode: 'relaxed', timerMode: 'unlimited' });
  const sessionId = created.sessionId;
  await call('interrogate', { sessionId, playerQuestion: '*Detective opens the file*' });
  const ended = await call('session/end', { sessionId, reason: 'giveup' });
  assert.equal(ended.outcome, 'lose_giveup');
  const result = await call('evaluate', { sessionId, type: 'lose' });
  assert.equal(result.conversationPath.length, 1);
  assert.equal(result.conversationPath[0].status, 'neutral');
  const recovered = await call(`session?sessionId=${sessionId}`);
  assert.deepEqual(recovered.result.conversationPath, result.conversationPath);
  assert.equal(recovered.stats.ranked, false);
  assert.equal(recovered.stats.playMode, 'relaxed');
  return { result, recoveredOutcome: recovered.outcome };
}

async function main() {
  const destination = process.env.REHEARSAL_OUTPUT ?? '/tmp/interrogation-live-rehearsal.json';
  try {
    const result = { win: await rehearse(), loss: await rehearseLoss() };
    // Session IDs and redemption tokens are bearer capabilities; retain only fictional prose and aggregate proof.
    const safe = JSON.parse(JSON.stringify(result, (key, value) => /token|sessionId|actionId|turnId|statementId|requestId/i.test(key) ? undefined : typeof value === 'string' ? value.replace(/\b[a-f0-9]{48}\b/g, '[session]') : value));
    await writeFile(destination, JSON.stringify({ executedAt: new Date().toISOString(), provider: 'codex-local',
      scope: 'Real local HTTP and Codex subscription; authored practice case. Browser, microphone and ElevenLabs not exercised.', timings, result: safe }, null, 2));
    console.log(`Local HTTP rehearsal passed. Evidence: ${destination}`);
  } catch (error) {
    await writeFile(destination, JSON.stringify({ executedAt: new Date().toISOString(), timings,
      error: error instanceof Error ? error.message : 'Rehearsal failed' }, null, 2));
    throw error;
  }
}
void main().catch(error => { console.error(error instanceof Error ? error.message : "Rehearsal failed"); process.exitCode = 1; });
