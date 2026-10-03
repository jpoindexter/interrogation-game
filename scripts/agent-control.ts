import { ControlError } from './agent-control/errors';
import { discovery, prepare, type Input } from './agent-control/commands';
import { call, origin, publicOutput, settled } from './agent-control/client';
import { acquire, load, save, type SavedSession } from './agent-control/storage';

async function readInput(): Promise<Input> {
  let source = '';
  for await (const chunk of process.stdin) {
    source += String(chunk);
    if (Buffer.byteLength(source) > 16384) throw new ControlError('Input exceeds 16 KB.');
  }
  const value: unknown = JSON.parse(source);
  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof (value as Input).command !== 'string') {
    throw new ControlError('Send one JSON object with a command.');
  }
  return value as Input;
}

async function readState(saved: SavedSession, command: string) {
  if (!saved.sessionId) throw new ControlError('No saved session. Run start first.');
  const reply = await call(saved.origin, `session?sessionId=${encodeURIComponent(saved.sessionId)}`);
  if (command !== 'result' || reply.status !== 200) return reply;
  if (!reply.data.outcome) throw new ControlError('The game is still active. Its result is not available.');
  return call(saved.origin, 'evaluate', { sessionId: saved.sessionId, type: reply.data.outcome === 'win' ? 'win' : 'lose' });
}

async function requireOpening(saved: SavedSession) {
  const state = await readState(saved, 'state');
  const gameplay = state.data.gameplay as { turns?: unknown[] } | undefined;
  if (state.status !== 200 || !gameplay?.turns || gameplay.turns.length > 0) throw new ControlError('Opening is unavailable or already recorded. Read state instead.');
}

async function preparePending(input: Input, saved: SavedSession) {
  if (input.command === 'retry') {
    if (!saved.pending) throw new ControlError('There is no pending request to retry.');
    return;
  }
  if (saved.pending) throw new ControlError('A request is unresolved. Run state, then retry the saved request.');
  if (input.command === 'start' && saved.sessionId) throw new ControlError('A session is already saved. Use a different AGENT_CONTROL_DIR for another case.');
  if (input.command === 'opening') await requireOpening(saved);
  saved.pending = prepare(input, saved.sessionId);
  await save(saved);
}

async function execute(input: Input, saved: SavedSession) {
  if (['state', 'result'].includes(input.command)) return readState(saved, input.command);
  if (input.command === 'discard-pending') {
    if (input.confirm !== true) throw new ControlError('Review state first, then send confirm:true to discard only the local pending request.');
    delete saved.pending; await save(saved);
    return { status: 200, data: { message: 'Pending request discarded locally. Any server action remains recorded.' } };
  }
  await preparePending(input, saved);
  const pending = saved.pending!;
  const reply = await call(saved.origin, pending.route, pending.body);
  if (pending.command === 'start' && reply.status === 200) {
    if (typeof reply.data.sessionId !== 'string' || !/^[a-f0-9]{48}$/.test(reply.data.sessionId)) throw new ControlError('Invalid session response. Retry the saved request.');
    saved.sessionId = reply.data.sessionId;
  }
  if (settled(reply, pending)) delete saved.pending;
  await save(saved);
  return { ...reply, pending: Boolean(saved.pending) };
}

async function main() {
  const input = await readInput();
  if (input.command === 'discover') { console.log(JSON.stringify({ ok: true, ...discovery })); return; }
  const base = origin();
  const release = await acquire();
  try {
    const result = await execute(input, await load(base));
    console.log(JSON.stringify(publicOutput({ ok: result.status >= 200 && result.status < 300, ...result })));
    if (result.status >= 400) process.exitCode = 1;
  } finally { await release(); }
}

void main().catch(error => {
  // Avoid printing arbitrary server/network exceptions containing bearer URLs or private input.
  console.log(JSON.stringify({ ok: false, error: error instanceof ControlError ? error.message : 'Command failed. Check input with discover and connection settings. If an action may have been sent, read state then retry; inspect only the private session file for recovery.' }));
  process.exitCode = 1;
});
