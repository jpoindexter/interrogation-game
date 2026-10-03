import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, parseSettings } from '../app/settings/settings-model';

test('settings hydrate only known values with valid types and ranges', () => {
  const parsed = parseSettings(JSON.stringify({ fontSize: 'huge', musicVolume: 90, ttsEnabled: 'false', timerMode: 'unlimited', injected: true }));
  assert.deepEqual(parsed, { ...DEFAULT_SETTINGS, timerMode: 'unlimited', playMode: 'relaxed' });
});

test('settings preserve valid preferences and recover corrupt storage', () => {
  assert.equal(parseSettings('{').fontFamily, DEFAULT_SETTINGS.fontFamily);
  assert.equal(parseSettings('{"voiceVolume":0}').voiceVolume, 0);
  assert.equal(parseSettings('{"highContrast":true}').highContrast, true);
});


test('play modes migrate legacy unlimited to relaxed and keep timer rules aligned', () => {
  assert.equal(parseSettings('{"timerMode":"unlimited"}').playMode, 'relaxed');
  const endurance = parseSettings('{"playMode":"endurance","timerMode":"countdown","reducedMotion":true}');
  assert.equal(endurance.timerMode, 'unlimited');
  assert.equal(endurance.reducedMotion, true);
  assert.equal(parseSettings('{"playMode":"challenge","timerMode":"unlimited"}').timerMode, 'countdown');
});
