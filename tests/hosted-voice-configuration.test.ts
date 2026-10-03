import assert from 'node:assert/strict';
import test from 'node:test';
import { hostedVoiceConfiguration } from '../src/lib/config/hosted-voice';

const environment = { SESSION_STORAGE: 'supabase', HOSTED_TEXT_ENABLED: 'true', AI_PROVIDER: 'openai',
  LEADERBOARD_STORAGE: 'supabase', EXPORT_STORAGE: 'supabase', OPENAI_API_KEY: 'synthetic-ai',
  SUPABASE_URL: 'https://voice-config.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service',
  HOSTED_DEPLOYMENT_ID: 'voice-config', HOSTED_AI_CALLS_PER_WINDOW: '10', HOSTED_AI_CHARACTERS_PER_WINDOW: '1000000',
  HOSTED_AI_WINDOW_SECONDS: '3600', HOSTED_VOICE_ENABLED: 'true', HOSTED_VOICE_BUCKET: 'private-voice',
  ELEVENLABS_API_KEY: 'synthetic-voice', HOSTED_TTS_CALLS_PER_WINDOW: '10', HOSTED_TTS_CHARACTERS_PER_WINDOW: '60000',
  HOSTED_STT_CALLS_PER_WINDOW: '10', HOSTED_STT_BYTES_PER_WINDOW: '31457280' };
test('voice configuration requires deliberate private storage and separate bounded speech/transcription allowances', () => {
  const configured = hostedVoiceConfiguration(environment);
  assert.equal(configured.policies.tts.sessionUnits, 60000);
  assert.equal(configured.policies.stt.sessionCalls, 100);
  assert.equal(configured.policies.tts.windowSeconds, 3600);
  assert.doesNotMatch(JSON.stringify(configured), /synthetic/);
  for (const changed of [{ HOSTED_VOICE_ENABLED: 'false' }, { HOSTED_VOICE_BUCKET: '../public' },
    { HOSTED_TTS_CALLS_PER_WINDOW: '' }, { HOSTED_STT_BYTES_PER_WINDOW: 'NaN' }, { ELEVENLABS_API_KEY: '' }]) {
    assert.throws(() => hostedVoiceConfiguration({ ...environment, ...changed }));
  }
  assert.equal(hostedVoiceConfiguration({ ...environment, HOSTED_TTS_CALLS_PER_WINDOW: '0' }).policies.tts.deploymentCalls, 0);
});
