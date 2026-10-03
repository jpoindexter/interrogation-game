import assert from 'node:assert/strict';
import test from 'node:test';
import { hostedConfiguration } from '../src/lib/config/hosted';
import { storageBackend, hostedStores } from '../src/lib/storage/backend';
import { readReadiness } from '../src/lib/config/readiness';
import { AI_WORK_LIMITS } from '../src/lib/limits/ai-policy';

const settings: Record<string, string> = {
  SESSION_STORAGE: 'supabase', HOSTED_TEXT_ENABLED: 'true', AI_PROVIDER: 'openai',
  SUPABASE_URL: 'https://private-fixture.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'private-fake-service',
  OPENAI_API_KEY: 'private-fake-openai', LEADERBOARD_STORAGE: 'supabase', EXPORT_STORAGE: 'supabase',
  HOSTED_DEPLOYMENT_ID: 'fixture-text', HOSTED_AI_CALLS_PER_WINDOW: '20',
  HOSTED_AI_CHARACTERS_PER_WINDOW: '200000', HOSTED_AI_WINDOW_SECONDS: '3600',
};
const keys = [...Object.keys(settings), 'VERCEL', 'AI_RAG_ENABLED', 'AI_WORK_ENABLED',
  'ELEVENLABS_API_KEY', 'NEXT_PUBLIC_SUPABASE_URL'];
function environment(t: test.TestContext, values: Record<string, string>) {
  const before = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  keys.forEach(key => { delete process.env[key]; });
  Object.assign(process.env, values);
  t.after(() => {
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Configuration must not perform network requests'); });
}

test('hosted selection requires explicit operator configuration and bounded integer budgets', () => {
  assert.deepEqual(hostedConfiguration(settings), { deployment: 'fixture-text', policy: {
    sessionCalls: AI_WORK_LIMITS.calls, sessionUnits: AI_WORK_LIMITS.inputCharacters,
    deploymentCalls: 20, deploymentUnits: 200000, windowSeconds: 3600,
  } });
  for (const name of Object.keys(settings)) {
    const partial = { ...settings }; delete partial[name];
    assert.throws(() => hostedConfiguration(partial), Error, name);
  }
  const invalid: Record<string, string>[] = [
    { HOSTED_TEXT_ENABLED: 'false' }, { AI_PROVIDER: 'codex-local' }, { AI_RAG_ENABLED: 'true' },
    { AI_RAG_ENABLED: 'unexpected' }, { LEADERBOARD_STORAGE: 'local' }, { EXPORT_STORAGE: 'local' },
    { SUPABASE_URL: 'http://localhost:54321' }, { SUPABASE_URL: 'https://private-fixture.supabase.co/other' },
    { SUPABASE_SERVICE_ROLE_KEY: ' ' }, { OPENAI_API_KEY: ' ' }, { OPENAI_API_KEY: 'contains\nnewline' },
    { HOSTED_DEPLOYMENT_ID: 'unsafe value' }, { HOSTED_AI_CALLS_PER_WINDOW: '1.5' },
    { HOSTED_AI_CALLS_PER_WINDOW: '-1' }, { HOSTED_AI_CALLS_PER_WINDOW: '1000001' },
    { HOSTED_AI_CHARACTERS_PER_WINDOW: '1e6' }, { HOSTED_AI_CHARACTERS_PER_WINDOW: '1000000000001' },
    { HOSTED_AI_WINDOW_SECONDS: '59' }, { HOSTED_AI_WINDOW_SECONDS: '86401' },
  ];
  for (const overrides of invalid) assert.throws(() => hostedConfiguration({ ...settings, ...overrides }));
  assert.equal(hostedConfiguration({ ...settings, HOSTED_AI_CALLS_PER_WINDOW: '0' }).policy.deploymentCalls, 0);
  assert.equal(hostedConfiguration({ ...settings, AI_RAG_ENABLED: 'false' }).deployment, 'fixture-text');
});

test('backend selection has no hosted-to-local fallback and adapters hold no shared session state', t => {
  environment(t, {});
  assert.equal(storageBackend(), 'local');
  process.env.VERCEL = '1';
  assert.throws(storageBackend, /explicit shared storage/);
  process.env.SESSION_STORAGE = 'local';
  assert.throws(storageBackend, /explicit shared storage/);
  process.env.VERCEL = '0';
  assert.throws(storageBackend, /explicit shared storage/);
  Object.assign(process.env, settings);
  assert.equal(storageBackend(), 'supabase');
  const first = hostedStores(), second = hostedStores();
  assert.equal(first.deployment, 'fixture-text');
  for (const name of ['sessions', 'work', 'generations', 'redemption', 'admission'] as const) {
    assert.notEqual(first[name], second[name], 'constructing adapters does not share a mutable session cache');
  }
  assert.doesNotMatch(JSON.stringify(first), /private-fake|private-fixture/);
  delete process.env.VERCEL;
  assert.equal(storageBackend(), 'supabase', 'a configured development server can exercise shared storage');
  delete process.env.HOSTED_TEXT_ENABLED;
  assert.throws(storageBackend, /HOSTED_TEXT_ENABLED/);
  assert.throws(hostedStores, /HOSTED_TEXT_ENABLED/);
  process.env.SESSION_STORAGE = 'unsupported';
  assert.throws(storageBackend, /unsupported/);
});

test('shared readiness reports configuration only, hides credentials and disables hosted voice', t => {
  environment(t, { ...settings, VERCEL: '1', ELEVENLABS_API_KEY: 'private-fake-voice' });
  const ready = readReadiness();
  assert.equal(ready.mode, 'hosted');
  assert.equal(ready.status, 'configured');
  assert.equal(ready.services.storage.provider, 'supabase');
  assert.equal(ready.services.storage.status, 'unchecked');
  assert.match(ready.services.storage.detail, /does not verify/);
  assert.equal(ready.services.voice.configured, false);
  assert.equal(ready.services.voice.observation, null);
  assert.match(ready.services.voice.detail, /text only/);
  assert.doesNotMatch(JSON.stringify(ready), /private-fake|private-fixture/);
  delete process.env.VERCEL;
  assert.equal(readReadiness().services.voice.configured, false, 'shared backend stays text-only on a development server');
  process.env.AI_WORK_ENABLED = 'false';
  assert.equal(readReadiness().status, 'configuration_required');
  assert.equal(storageBackend(), 'supabase', 'operator inference stop does not discard existing shared results');
  delete process.env.HOSTED_AI_WINDOW_SECONDS;
  const incomplete = readReadiness();
  assert.equal(incomplete.services.storage.configured, false);
  assert.doesNotMatch(JSON.stringify(incomplete), /private-fake|private-fixture/);
});
