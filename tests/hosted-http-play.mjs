import assert from 'node:assert/strict';

export async function http(server, path, body, expected = 200, ip = '203.0.113.10') {
  const response = await fetch(`${server.base}/api/${path}`, {
    method: body === undefined ? 'GET' : 'POST', signal: AbortSignal.timeout(30_000),
    headers: { 'content-type': 'application/json', 'x-real-ip': ip },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  assert.equal(response.status, expected, `${path.split('?')[0]} returned ${response.status}, code=${data.code ?? 'none'}`);
  return data;
}

export async function playEvidence(server, sessionId, turnId, transport) {
  const pinned = await http(server, 'gameplay', { sessionId, requestId: 'pin-opening-01', kind: 'pin', turnId });
  assert.equal(pinned.statement.claimId, undefined);
  const action = { id: 'evidence-wrong-01', kind: 'present_evidence', statementId: pinned.statement.id,
    exhibitId: 'badge-record', question: 'How does this record fit your account?' };
  const wrongInput = { sessionId, requestId: action.id, kind: 'action', action };
  const wrong = await http(server, 'gameplay', wrongInput);
  assert.equal(wrong.result.status, 'not_established');
  const calls = transport.calls();
  assert.deepEqual(await http(server, 'gameplay', wrongInput), wrong);
  assert.equal(transport.calls(), calls, 'evidence receipt replay does not infer');
  const correctAction = { ...action, id: 'evidence-right-01', exhibitId: 'visitor-log' };
  const established = await http(server, 'gameplay', {
    sessionId, requestId: correctAction.id, kind: 'action', action: correctAction,
  });
  assert.equal(established.result.status, 'contradiction_established');
  assert.equal(established.cluesCollected, 1);
  const wrongAccusation = await http(server, 'accuse', { sessionId, requestId: 'accuse-wrong-01', accusation: 'You stole Morgan’s badge.' });
  assert.equal(wrongAccusation.correct, false);
  const winningInput = { sessionId, requestId: 'accuse-right-01',
    accusation: 'You said you never returned after six, but your signed arrival is 18:42.' };
  const win = await http(server, 'accuse', winningInput);
  assert.equal(win.correct, true); assert.equal(win.outcome, 'win');
  assert.equal(win.accusationsLeft, 1); assert.match(win.winToken, /^[a-f0-9]{32}$/);
  assert.equal(win.export.state, 'saved'); assert.equal(win.export.destination, 'supabase');
  return { win, winningInput };
}

export async function assertSharedAdmission(first, second) {
  // Use an independent endpoint identity, avoiding the playthrough's submission allowance.
  // Eleven requests is the smallest unseeded proof of the configured ten-request cap.
  if (Date.now() % 60_000 > 56_000) await new Promise(resolve => setTimeout(resolve, 4100));
  for (let index = 0; index < 10; index++) {
    await http(index % 2 ? first : second, 'leaderboard', {}, 401, '203.0.113.77');
  }
  const denied = await http(first, 'leaderboard', {}, 429, '203.0.113.77');
  assert.equal(denied.code, 'RATE_LIMITED');
}
