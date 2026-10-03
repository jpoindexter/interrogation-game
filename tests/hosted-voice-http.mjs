import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isolatedPostgres } from './hosted-storage-postgres-cluster.mjs';
import { startNext } from './hosted-http-server.mjs';
import { http } from './hosted-http-play.mjs';
import { fixtureOptions, voiceTransport } from './hosted-voice-http-fixture.mjs';

const migrations = ['001_private_leaderboard', '004_leaderboard_play_mode', '006_hosted_sessions',
  '007_hosted_budgets', '008_hosted_terminal_export', '009_hosted_claimed_work', '010_hosted_redemption',
  '011_hosted_generation', '012_hosted_generation_finish', '013_hosted_endpoint_limits',
  '014_hosted_reads', '015_hosted_request_identity', '016_hosted_export_page', '017_hosted_voice',
  '018_hosted_retention', '019_hosted_audio_retention'];

async function transcribe(server, sessionId, requestId, size = 30, expected = 200) {
  const form = new FormData();
  form.set('sessionId', sessionId); form.set('requestId', requestId);
  form.set('audio', new Blob([new Uint8Array(size)], { type: 'audio/webm' }), 'recording.webm');
  const response = await fetch(`${server.base}/api/transcribe`, { method: 'POST', body: form,
    headers: { 'x-real-ip': '203.0.113.10' }, signal: AbortSignal.timeout(30_000) });
  const data = await response.json();
  assert.equal(response.status, expected, `transcribe status=${response.status} code=${data.code ?? 'none'}`);
  return data;
}

async function exercise(first, second, database, transport) {
  await http(first, 'tts', { sessionId: 'invalid', requestId: 'unauthorized-tts', text: 'Unauthorized' }, 401);
  await transcribe(second, 'invalid', 'unauthorized-stt', 30, 401);
  assert.equal(transport.calls.tts + transport.calls.stt, 0);
  assert.equal(await database.sql('SELECT count(*) FROM interrogation_private.voice_requests;'), '0');
  const created = await http(first, 'generate-case', { requestId: 'voice-http-case', mode: 'redteam', difficulty: 'easy', playMode: 'relaxed' });
  const { sessionId } = created;
  const opening = await http(first, 'interrogate', { sessionId, requestId: 'voice-http-opening', playerQuestion: '*Detective sits down*' });
  const speech = { sessionId, requestId: 'voice-http-speech', text: opening.spoken_response };
  assert.equal(typeof speech.text, 'string');
  const delivered = await http(first, 'tts', speech);
  const replayed = await http(second, 'tts', speech);
  assert.equal(delivered.sha256, replayed.sha256);
  assert.equal(delivered.bytes, replayed.bytes);
  assert.notEqual(delivered.audioUrl, replayed.audioUrl, 'replay signs a fresh URL');
  assert.equal(transport.calls.tts, 1); assert.equal(transport.calls.upload, 1);
  assert.equal((await transcribe(first, sessionId, 'voice-http-recording')).text, 'Where were you at six?');
  assert.equal((await transcribe(second, sessionId, 'voice-http-recording')).text, 'Where were you at six?');
  assert.equal(transport.calls.stt, 1);
  await transcribe(second, sessionId, 'voice-http-oversized', 3 * 1024 * 1024 + 1, 413);
  assert.equal(transport.calls.stt, 1);
  console.log('PASS public HTTP: authorization rejects before reservations/providers; TTS immutable object and fresh signing replay; STT exact replay; 3MiB recording limit.');

  transport.loseNextFinish();
  const interrupted = { ...speech, requestId: 'voice-http-lost-finish' };
  assert.equal((await http(first, 'tts', interrupted, 503)).code, 'VOICE_STORAGE_UNAVAILABLE');
  assert.equal(transport.calls.tts, 2); assert.equal(transport.calls.upload, 2);
  assert.equal(await database.sql("SELECT count(*) FROM interrogation_private.voice_requests WHERE state='pending';"), '1');
  await first.stop();
  await database.sql("UPDATE interrogation_private.voice_requests SET lease_until=clock_timestamp()-interval '1 second' WHERE state='pending';");
  const recovered = await http(second, 'tts', interrupted);
  assert.equal(recovered.sha256, delivered.sha256);
  assert.equal(transport.calls.tts, 2); assert.equal(transport.calls.upload, 2); assert.equal(transport.calls.download, 1);
  assert.equal(await database.sql("SELECT count(*) FROM interrogation_private.voice_requests WHERE state='pending';"), '0');
  assert.equal(await database.sql('SELECT count(*) FROM interrogation_private.voice_requests;'), '3');
  console.log('PASS saved-object recovery after lost SQL finish and worker shutdown: original request ID retrieves exact audio; no repeated TTS or upload.');
}

async function main() {
  const build = (await readFile('.next/BUILD_ID', 'utf8')).trim();
  const database = await isolatedPostgres();
  const directory = await mkdtemp(join(tmpdir(), 'hosted-voice-http-'));
  const servers = [];
  const transport = voiceTransport(database);
  try {
    for (const migration of migrations) await database.migrate(`database/migrations/${migration}.sql`);
    const first = await startNext(directory, transport, fixtureOptions); servers.push(first);
    const second = await startNext(directory, transport, fixtureOptions); servers.push(second);
    assert.notEqual(first.child.pid, second.child.pid);
    console.log(`Actual Next production voice HTTP acceptance; build=${build}; two independent processes.`);
    await exercise(first, second, database, transport);
    assert.equal(transport.errors.length, 0, transport.errors[0]?.message);
    assert.equal(transport.base.errors.length, 0, transport.base.errors[0]?.message);
    assert.equal(transport.base.calls(), 0, 'authored opening needs no OpenAI call');
    assert.deepEqual(await readdir(directory), [], 'no local voice or session fallback');
    console.log('PASS exactly 2 controlled TTS calls, 1 STT call, 2 uploads, 1 recovery download; no local fallback files.');
    console.log('Scope: actual Next production HTTP and PostgreSQL019; controlled ElevenLabs and Supabase SDK Storage/RPC transport. Not live account, Vercel, real bucket, audio decoding or browser microphone proof.');
    console.log('Fault injection: SQL finish delivery dropped before commit after immutable upload; first process stopped; pending lease advanced without sleeping.');
  } finally {
    await Promise.allSettled(servers.map(server => server.stop()));
    await database.stop(); await rm(directory, { recursive: true, force: true });
    console.log('CLEANUP production servers, isolated PostgreSQL and temporary directory removed.');
  }
}
main().catch(error => {
  console.error(String(error.stack ?? error).replace(/[a-f0-9]{32,}/g, '[redacted identifier]'));
  process.exitCode = 1;
});
