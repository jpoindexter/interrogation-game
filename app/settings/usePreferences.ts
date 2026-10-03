import { useBrowserStorage } from '../components/useBrowserStorage';
import { PREFERENCES_KEY } from './preferences-store';
import { parseSettings } from './settings-model';

export function usePreferences() {
  const stored = useBrowserStorage(PREFERENCES_KEY);
  const legacy = useBrowserStorage('appSettings');
  return parseSettings(stored ?? legacy);
}
