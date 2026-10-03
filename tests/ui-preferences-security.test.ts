import test from 'node:test';
import assert from 'node:assert/strict';
import { readPreferences, savePreferences } from '../app/settings/preferences-store';
import { getUserApiHeaders } from '../app/lib/api-keys';
import { parseReadiness } from '../app/settings/provider-readiness';

function installStorage(context: { after: (callback: () => void) => void }, initial: Record<string, string>) {
  const items = new Map(Object.entries(initial));
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
  } });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { dispatchEvent: () => true } });
  context.after(() => {
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  });
  return items;
}

test('legacy preferences survive while credentials are excluded and old storage is untouched', context => {
  const legacy = JSON.stringify({ musicVolume: 0.35, timerMode: 'unlimited', mistralApiKey: 'legacy-dummy', elevenlabsApiKey: 'voice-dummy', supabaseAnonKey: 'db-dummy' });
  const items = installStorage(context, { appSettings: legacy });
  assert.equal(readPreferences().musicVolume, 0.35);
  assert.equal(readPreferences().timerMode, 'unlimited');
  assert.equal('mistralApiKey' in readPreferences(), false);
  assert.equal(savePreferences({ voiceVolume: 0.2 }), true);
  const saved = items.get('appPreferences')!;
  assert.doesNotMatch(saved, /legacy-dummy|voice-dummy|db-dummy|ApiKey|supabase/);
  assert.equal(JSON.parse(saved).musicVolume, 0.35);
  assert.equal(items.get('appSettings'), legacy);
  assert.deepEqual(getUserApiHeaders(), {});
});

test('new preferences take precedence and injected unknown fields are never persisted', context => {
  const items = installStorage(context, { appSettings: '{"musicVolume":0.9}', appPreferences: '{"musicVolume":0.1}' });
  assert.equal(readPreferences().musicVolume, 0.1);
  savePreferences({ musicVolume: 0.2, secret: 'must-not-persist' } as Parameters<typeof savePreferences>[0]);
  assert.doesNotMatch(items.get('appPreferences')!, /secret|must-not-persist/);
});

test('readiness requires the explicit configuration-only contract', () => {
  const service = { provider: 'codex-local', configured: true, status: 'unchecked', detail: 'Configuration only.' };
  const expected = { mode: 'local', status: 'configured', services: { ai: service, voice: service, storage: service } };
  assert.deepEqual(parseReadiness(expected), expected);
  assert.throws(() => parseReadiness({ ...expected, status: 'connected' }));
  assert.throws(() => parseReadiness({ ...expected, services: { ai: service } }));
  assert.throws(() => parseReadiness({ ...expected, services: { ...expected.services, voice: { ...service, configured: 'true' } } }));
});
