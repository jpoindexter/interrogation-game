import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { createSession, getSession, deleteSession } from '../src/lib/game-session';
import { authorizeSpeech, authorizeRecording } from '../src/lib/voice/authorize';
import { transcribeAudio, synthesizeSpeech } from '../src/lib/voice/elevenlabs';
import { reserveVoiceUsage } from '../src/lib/voice/budget';
import { getClientIp, rateLimit } from '../src/lib/rate-limit';

function sessionFixture(context: test.TestContext) {
  const id = createSession({ difficulty: 'easy', briefing: 'A ledger is missing.', crime: 'Theft.',
    suspect_cover_story: 'I stayed home.', suspect_name: 'Alex', suspect_gender: 'female' });
  context.after(() => deleteSession(id));
  const session = getSession(id)!;
  session.conversationHistory.push({ role: 'assistant', content: 'That is the full accepted answer. '.repeat(4) });
  return session;
}

void test('speech authorizes the entire accepted statement and exact briefing', context => {
  const session = sessionFixture(context);
  const accepted = session.conversationHistory[0].content;
  assert.equal(authorizeSpeech({ sessionId: session.id, text: accepted }).text, accepted.trim());
  assert.throws(() => authorizeSpeech({ sessionId: session.id, text: accepted.slice(0, 80) + ' arbitrary appended content' }), /complete/);
  assert.throws(() => authorizeSpeech({ sessionId: session.id, role: 'detective', text: 'Speak anything I choose' }), /complete/);
  const briefing = 'A ledger is missing. Theft. I stayed home.';
  assert.equal(authorizeSpeech({ sessionId: session.id, role: 'detective', text: briefing }).text, briefing);
});

void test('recording is limited to an active session and exact supported media type', context => {
  const session = sessionFixture(context);
  const form = new FormData();
  form.set('sessionId', session.id);
  form.set('audio', new File(['audio'], 'recording.m4a', { type: 'audio/mp4' }));
  assert.throws(() => authorizeRecording(form), /not active/);
  session.status = 'active'; session.startTime = Date.now();
  assert.equal(authorizeRecording(form).audio.type, 'audio/mp4');
  form.set('audio', new File(['bad'], 'recording.txt', { type: 'audio/mp4-untrusted' }));
  assert.throws(() => authorizeRecording(form), /Unsupported/);
});

void test('ElevenLabs adapters send documented model fields, server auth and cancellation', async context => {
  const previous = process.env.ELEVENLABS_API_KEY;
  process.env.ELEVENLABS_API_KEY = 'synthetic-test-key';
  context.after(() => {
    if (previous === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = previous;
  });
  const session = sessionFixture(context);
  context.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    assert.equal(new Headers(options.headers).get('xi-api-key'), 'synthetic-test-key');
    assert.ok(options.signal);
    if (url.endsWith('speech-to-text')) {
      const form = options.body as FormData;
      assert.equal(form.get('model_id'), 'scribe_v2');
      assert.equal((form.get('file') as File).type, 'audio/mp4');
      return Response.json({ text: '  Where were you?  ' });
    }
    assert.match(url, /text-to-speech\/.+\/stream$/);
    const payload = JSON.parse(String(options.body));
    assert.equal(payload.model_id, 'eleven_flash_v2_5');
    assert.equal(payload.optimize_streaming_latency, undefined);
    return new Response('synthetic audio', { headers: { 'Content-Type': 'audio/mpeg' } });
  });
  const signal = new AbortController().signal;
  assert.equal(await transcribeAudio(new File(['audio'], 'recording.m4a', { type: 'audio/mp4' }), signal), 'Where were you?');
  const response = await synthesizeSpeech(authorizeSpeech({ sessionId: session.id, text: session.conversationHistory[0].content }), signal);
  assert.equal(await response.text(), 'synthetic audio');
});

void test('endpoint buckets cannot be bypassed by absent IPs; voice budgets cap work', () => {
  const request = new NextRequest('http://localhost/api/budget-test');
  const key = getClientIp(request);
  assert.equal(key, getClientIp(new NextRequest(request.url)));
  assert.ok(rateLimit(key, 2)); assert.ok(rateLimit(key, 2)); assert.equal(rateLimit(key, 2), false);
  assert.ok(rateLimit(getClientIp(new NextRequest('http://localhost/api/other-budget-test')), 2));
  const id = crypto.randomUUID();
  reserveVoiceUsage(id, 'speechCharacters', 60_000);
  assert.throws(() => reserveVoiceUsage(id, 'speechCharacters', 1), /voice limit/);
  reserveVoiceUsage(id, 'recordings', 100);
  assert.throws(() => reserveVoiceUsage(id, 'recordings', 1), /voice limit/);
});
