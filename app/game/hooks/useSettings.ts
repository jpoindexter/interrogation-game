import { useState, useCallback } from 'react';
import type { GameSettings } from '../components/SettingsPanel';

const DEFAULTS: GameSettings = {
  ttsEnabled: process.env.NODE_ENV !== 'development',
  musicVolume: 0.05,
  fontSize: 'medium',
  fontFamily: 'mono',
  highContrast: false,
};

export function useSettings() {
  const [settings, setSettings] = useState<GameSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const s = localStorage.getItem('appSettings');
        if (s) return { ...DEFAULTS, ...JSON.parse(s) };
      } catch {}
    }
    return DEFAULTS;
  });

  const updateSettings = useCallback((next: GameSettings) => {
    setSettings(next);
    localStorage.setItem('appSettings', JSON.stringify(next));
    window.dispatchEvent(new Event('settingsChanged'));
  }, []);

  return { settings, updateSettings };
}
