import assert from 'node:assert/strict';
import { fixtureTransport } from './hosted-http-server.mjs';

export const fixtureOptions = {
  preload: 'tests/hosted-voice-http-preload.mjs',
  env: { HOSTED_VOICE_ENABLED: 'true', HOSTED_VOICE_BUCKET: 'private-voice', ELEVENLABS_API_KEY: 'synthetic-voice',
    HOSTED_TTS_CALLS_PER_WINDOW: '20', HOSTED_TTS_CHARACTERS_PER_WINDOW: '100000',
    HOSTED_STT_CALLS_PER_WINDOW: '20', HOSTED_STT_BYTES_PER_WINDOW: '10000000' },
};
const audio = Buffer.from('controlled synthetic speech bytes');

export function voiceTransport(database) {
  const base = fixtureTransport(database);
  const objects = new Map();
  const calls = { tts: 0, stt: 0, upload: 0, download: 0, sign: 0, privateReads: 0 };
  let lostFinish = false;
  const errors = [];
  function storage(message) {
    assert.equal(message.headers.authorization, 'Bearer synthetic-service');
    if (message.path === '/storage/v1/bucket/private-voice') {
      calls.privateReads++; return { value: { id: 'private-voice', public: false } };
    }
    const sign = message.path.startsWith('/storage/v1/object/sign/');
    const key = message.path.replace(sign ? '/storage/v1/object/sign/private-voice/' : '/storage/v1/object/private-voice/', '');
    assert.match(key, /^[a-f0-9]{64}\/tts\/[a-f0-9]{64}\.mp3$/);
    if (sign) {
      assert.equal(JSON.parse(Buffer.from(message.body, 'base64').toString()).expiresIn, 60);
      assert.ok(objects.has(key)); calls.sign++;
      return { value: { signedURL: `/object/sign/private-voice/${key}?token=synthetic-${calls.sign}` } };
    }
    if (message.method === 'POST') {
      assert.equal(message.headers['x-upsert'], 'false');
      assert.equal(objects.has(key), false, 'immutable audio is never uploaded twice');
      objects.set(key, message.body); calls.upload++;
      return { value: { Id: 'synthetic', Key: `private-voice/${key}` } };
    }
    assert.ok(objects.has(key)); calls.download++;
    return { binary: objects.get(key), headers: { 'content-type': 'audio/mpeg' } };
  }
  function provider(message) {
    if (message.path === '/v1/speech-to-text') {
      calls.stt++; assert.equal(message.body.model_id, 'scribe_v2');
      return { value: { text: 'Where were you at six?' } };
    }
    assert.match(message.path, /^\/v1\/text-to-speech\/[^/]+\/stream$/);
    assert.equal(message.body.model_id, 'eleven_flash_v2_5'); calls.tts++;
    return { binary: audio.toString('base64'), headers: { 'content-type': 'audio/mpeg' } };
  }
  async function respond(child, message) {
    if (message?.type !== 'fixture-request') return;
    if (lostFinish && message.kind === 'rpc' && message.name === 'interrogation_voice_finish') {
      lostFinish = false;
      child.send({ type: 'fixture-reply', id: message.id, error: true });
      return;
    }
    if (!['storage', 'voice'].includes(message.kind)) return base.respond(child, message);
    try {
      const result = message.kind === 'storage' ? storage(message) : provider(message);
      child.send({ type: 'fixture-reply', id: message.id, ...result });
    } catch (error) {
      errors.push(error); child.send({ type: 'fixture-reply', id: message.id, error: true });
    }
  }
  return { respond, calls, objects, errors, base, loseNextFinish() { lostFinish = true; } };
}
