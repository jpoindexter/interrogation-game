import { useCallback } from 'react';
import type { GameSettings } from '../components/SettingsPanel';
import { usePreferences } from '../../settings/usePreferences';
import { savePreferences } from '../../settings/preferences-store';

export function useSettings() {
  const settings = usePreferences();
  const updateSettings = useCallback((next: GameSettings) => savePreferences(next), []);
  return { settings, updateSettings };
}
