import { DEFAULT_SETTINGS, parseSettings, type AppSettings } from './settings-model';

export const PREFERENCES_KEY = 'appPreferences';

/** Migrate only allowlisted preferences; never copy or modify legacy credentials. */
export function readPreferences(): AppSettings {
  try { return parseSettings(localStorage.getItem(PREFERENCES_KEY) ?? localStorage.getItem('appSettings')); }
  catch { return DEFAULT_SETTINGS; }
}

export function savePreferences(settings: Partial<AppSettings>): boolean {
  try {
    const safe = parseSettings(JSON.stringify({ ...readPreferences(), ...settings }));
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(safe));
    window.dispatchEvent(new Event('settingsChanged'));
    return true;
  } catch { return false; }
}
