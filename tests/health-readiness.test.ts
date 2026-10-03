import assert from 'node:assert/strict';
import test from 'node:test';
import { GET as health } from '../app/api/health/route';
import { parseReadiness } from '../app/settings/provider-readiness';
import { sessionRepositoryKey } from '../src/lib/session/repository';

const keys = ['AI_PROVIDER', 'AI_WORK_ENABLED', 'CODEX_BIN', 'OPENAI_API_KEY', 'ELEVENLABS_API_KEY',
  'LEADERBOARD_STORAGE', 'SESSION_STORAGE', 'SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'VERCEL'];

test('actual health handler reports only configuration, reflects runtime storage guards and never exposes supplied secrets', async t => {
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  t.after(() => { for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  } });
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Health must not call external providers'); });
  const scenarios = [
    { name: 'local CLI installation is not sign-in proof', env: {}, ai: true, voice: false, storage: true, mode: 'local' },
    { name: 'operator stopped', env: { AI_WORK_ENABLED: 'false' }, ai: false, voice: false, storage: true, mode: 'local' },
    { name: 'API key missing', env: { AI_PROVIDER: 'openai' }, ai: false, voice: false, storage: true, mode: 'local' },
    { name: 'unverified server keys including optional voice', env: { AI_PROVIDER: 'openai', OPENAI_API_KEY: 'private-fake-ai', ELEVENLABS_API_KEY: 'private-fake-voice' }, ai: true, voice: true, storage: true, mode: 'local' },
    { name: 'voice is optional with text settings', env: { AI_PROVIDER: 'openai', OPENAI_API_KEY: 'private-fake-ai' }, ai: true, voice: false, storage: true, mode: 'local' },
    { name: 'empty explicit provider is invalid like runtime', env: { AI_PROVIDER: '' }, ai: false, voice: false, storage: true, mode: 'local' },
    { name: 'unknown provider is not echoed', env: { AI_PROVIDER: 'private-unknown-provider' }, ai: false, voice: false, storage: true, mode: 'local' },
    { name: 'empty custom CLI is unavailable', env: { CODEX_BIN: '' }, ai: false, voice: false, storage: true, mode: 'local' },
    { name: 'custom CLI configuration is not installation proof', env: { CODEX_BIN: '/private/unchecked-codex' }, ai: true, voice: false, storage: true, mode: 'local' },
    { name: 'unsupported local session backend', env: { SESSION_STORAGE: 'supabase' }, ai: true, voice: false, storage: false, mode: 'local' },
    { name: 'configured remote leaderboard does not implement hosted sessions', env: { VERCEL: '1', AI_PROVIDER: 'openai', OPENAI_API_KEY: 'private-fake-ai', LEADERBOARD_STORAGE: 'supabase', SUPABASE_URL: 'https://private-fixture.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'private-fake-service' }, ai: true, voice: false, storage: false, mode: 'hosted' },
    { name: 'hosted CLI remains unsupported', env: { VERCEL: '1' }, ai: false, voice: false, storage: false, mode: 'hosted' },
    { name: 'runtime treats any nonempty hosted marker as unsupported', env: { VERCEL: '0' }, ai: false, voice: false, storage: false, mode: 'hosted' },
    { name: 'invalid storage provider is not echoed', env: { LEADERBOARD_STORAGE: 'private-unknown-storage' }, ai: true, voice: false, storage: false, mode: 'local' },
  ];
  for (const scenario of scenarios) {
    keys.forEach(key => { delete process.env[key]; });
    Object.assign(process.env, scenario.env);
    const response = health();
    assert.equal(response.status, 200); assert.equal(response.headers.get('Cache-Control'), 'no-store');
    const raw = await response.json();
    const result = parseReadiness(raw);
    assert.equal(result.services.ai.configured, scenario.ai, scenario.name);
    assert.equal(result.services.voice.configured, scenario.voice, scenario.name);
    assert.equal(result.services.storage.configured, scenario.storage, scenario.name);
    assert.equal(result.mode, scenario.mode, scenario.name);
    assert.equal(result.status, scenario.ai && scenario.storage ? 'configured' : 'configuration_required', scenario.name);
    for (const service of Object.values(result.services)) assert.equal(service.status, service.configured ? 'unchecked' : 'missing');
    assert.doesNotMatch(JSON.stringify(result), /private-fake|private-unknown|private-fixture|\/private\/unchecked/);
    if (scenario.mode === 'hosted' || process.env.SESSION_STORAGE === 'supabase') assert.throws(sessionRepositoryKey, /not configured/);
  }
});
