import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { resolve, join } from 'node:path';
import { json, literal } from './hosted-storage-postgres-cluster.mjs';

export function fixtureTransport(database) {
  let providerCalls = 0, hold = null;
  const handles = [];
  async function rpc(message) {
    assert.match(message.name, /^interrogation_[a-z_]+$/);
    const args = Object.entries(message.args).map(([key, value]) => {
      assert.match(key, /^p_[a-z_]+$/);
      return `${key} => ${value === null ? 'NULL' : typeof value === 'object' ? json(value)
        : typeof value === 'number' ? String(value) : literal(value)}`;
    });
    return database.rpc(message.name, args);
  }
  async function provider(body) {
    providerCalls++;
    if (hold) { const waiting = hold; hold = null; waiting.entered(); await waiting.wait; }
    const capability = body.text.format.name;
    assert.ok(['interrogation_judge', 'interrogation_suspect'].includes(capability));
    const input = JSON.parse(body.input[1].content);
    const correct = String(input.playerAccusation).includes('18:42');
    const output = capability === 'interrogation_judge'
      ? { correct, confession: correct ? 'I returned that evening.' : 'That is not my account.',
        explanation: correct ? 'The signed arrival contradicts the claim of no return.' : 'The accusation is about a different claim.' }
      : { spoken_response: 'That record needs some context, detective.', internal_state: 'Defensive',
        stress_level: 2, clue_unlocked: null, caught: false };
    return { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(output) }] }] };
  }
  async function respond(child, message) {
    if (message?.type !== 'fixture-request') return;
    try {
      let value;
      if (message.kind === 'rpc') value = await rpc(message);
      else if (message.kind === 'provider') value = await provider(message.body);
      else {
        assert.equal(message.kind, 'leaderboard');
        const query = new URLSearchParams(message.query);
        assert.equal(query.get('ranked'), 'eq.true'); assert.equal(query.get('play_mode'), 'eq.challenge');
        value = JSON.parse(await database.sql("SELECT coalesce(json_agg(row_to_json(l)),'[]'::json) FROM (SELECT * FROM public.leaderboard WHERE ranked AND play_mode='challenge' ORDER BY score DESC LIMIT 20) l;"));
      }
      if (child.connected) child.send({ type: 'fixture-reply', id: message.id, value });
    } catch (error) {
      handles.push(error);
      if (child.connected) child.send({ type: 'fixture-reply', id: message.id, error: true });
    }
  }
  return { respond, calls: () => providerCalls, errors: handles,
    holdNext() {
      let entered, release;
      const seen = new Promise(resolve => { entered = resolve; });
      const wait = new Promise(resolve => { release = resolve; });
      hold = { entered, wait };
      return { seen, release };
    } };
}

async function freePort() {
  const socket = createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  return port;
}

export async function startNext(root, transport) {
  const port = await freePort();
  const child = spawn(process.execPath, ['--import', resolve('tests/hosted-http-transport.mjs'),
    resolve('node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'], env: { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
      VERCEL: '1', SESSION_STORAGE: 'supabase', HOSTED_TEXT_ENABLED: 'true', AI_PROVIDER: 'openai',
      OPENAI_API_KEY: 'synthetic-openai', SUPABASE_URL: 'https://http-fixture.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service', LEADERBOARD_STORAGE: 'supabase', EXPORT_STORAGE: 'supabase',
      HOSTED_DEPLOYMENT_ID: 'http-acceptance', HOSTED_AI_CALLS_PER_WINDOW: '20',
      HOSTED_AI_CHARACTERS_PER_WINDOW: '1000000', HOSTED_AI_WINDOW_SECONDS: '3600',
      AI_WORK_ENABLED: 'true', AI_RAG_ENABLED: 'false', ELEVENLABS_API_KEY: '',
      INTERROGATION_DATA_DIR: join(root, String(port)) },
  });
  let logs = '';
  child.stdout.on('data', chunk => { logs += chunk; });
  child.stderr.on('data', chunk => { logs += chunk; });
  child.on('message', message => { void transport.respond(child, message); });
  const closed = new Promise(resolve => child.once('close', resolve));
  const base = `http://127.0.0.1:${port}`;
  const stop = async () => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); await closed; };
  try {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) throw new Error(`Next production server exited: ${logs.slice(-1500)}`);
      try { if ((await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(500) })).ok) return { base, child, stop }; } catch { /* bounded readiness polling */ }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Next production server did not become ready');
  } catch (error) { await stop(); throw error; }
}
