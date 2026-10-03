import { useState } from 'react';
import { usePreferences } from './usePreferences';
import { DEFAULT_SETTINGS, type AppSettings } from './settings-model';
import { savePreferences } from './preferences-store';
import { playClick } from '../lib/sfx-utils';

export function useSettingsPage() {
  const settings = usePreferences();
  const [saveError, setSaveError] = useState(false);
  const update = (patch: Partial<AppSettings>) => setSaveError(!savePreferences({ ...settings, ...patch }));
  const handleReset = () => { playClick(); setSaveError(!savePreferences(DEFAULT_SETTINGS)); };
  return { settings, update, handleReset, saveError };
}
