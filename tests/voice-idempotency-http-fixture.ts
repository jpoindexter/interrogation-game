import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { once } from 'node:events';
import type { TestContext } from 'node:test';
import { NextRequest } from 'next/server';
import { POST as speech } from '../app/api/tts/route';
import { POST as transcribe } from '../app/api/transcribe/route';
import { createSession, getSession, deleteSession } from '../src/lib/game-session';
import { persistSession } from '../src/lib/session/store';
import { deferred } from './audio-fixtures';

async function route(incoming: IncomingMessage, outgoing: ServerResponse) {
  const chunks: Buffer[] = [];
  for await (const chunk of incoming) chunks.push(Buffer.from(chunk));
  const controller = new AbortController();
  outgoing.on('close', () => { if (!outgoing.writableEnded) controller.abort(); });
  const request = new NextRequest(`http://127.0.0.1${incoming.url}`, {
    method: 'POST', headers: incoming.headers as HeadersInit, body: Buffer.concat(chunks), signal: controller.signal,
  });
  const response = await (incoming.url === '/api/tts' ? speech(request) : transcribe(request));
  outgoing.writeHead(response.status, Object.fromEntries(response.headers));
  outgoing.end(Buffer.from(await response.arrayBuffer()));
}

export async function voiceHttpFixture(t: TestContext) {
  const server = createServer((request, response) => { void route(request, response).catch(() => { response.writeHead(500).end(); }); });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing HTTP address');
  const sessionId = createSession({ difficulty: 'easy', suspect_name: 'Casey', suspect_gender: 'nonbinary' });
  const session = getSession(sessionId)!;
  session.status = 'active'; session.startTime = Date.now();
  session.conversationHistory.push({ role: 'assistant', content: 'I left at six.' }, { role: 'assistant', content: 'That was my account.' });
  persistSession(sessionId);
  t.after(() => deleteSession(sessionId));
  const previous = process.env.ELEVENLABS_API_KEY;
  process.env.ELEVENLABS_API_KEY = 'synthetic-voice-test-key';
  t.after(() => { if (previous === undefined) delete process.env.ELEVENLABS_API_KEY; else process.env.ELEVENLABS_API_KEY = previous; });
  return { base: `http://127.0.0.1:${address.port}`, sessionId };
}

export function providerFixture(t: TestContext) {
  const original = globalThis.fetch;
  const entered = deferred<void>();
  const release = deferred<void>();
  const state = { calls: 0, hold: false, fail: false };
  t.mock.method(globalThis, 'fetch', async (url: string | URL | Request, options?: RequestInit) => {
    if (!String(url).startsWith('https://api.elevenlabs.io/')) return original(url, options);
    state.calls++;
    entered.resolve();
    if (state.hold) await release.promise;
    if (state.fail) return new Response('failure', { status: 502 });
    return String(url).includes('speech-to-text') ? Response.json({ text: 'Where were you?' })
      : new Response('synthetic-mp3', { headers: { 'Content-Type': 'audio/mpeg' } });
  });
  return { state, entered, release };
}
export function speechRequest(sessionId: string, requestId = crypto.randomUUID()) {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, requestId, text: 'I left at six.' }) };
}
export function recordingRequest(sessionId: string, requestId: string, content = 'synthetic-recording') {
  const form = new FormData();
  form.set('sessionId', sessionId); form.set('requestId', requestId);
  form.set('audio', new File([content], 'recording.m4a', { type: 'audio/mp4' }));
  return { method: 'POST', body: form };
}
