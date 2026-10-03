export interface AppSettings {
  ttsEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  voiceVolume: number;
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: 'mono' | 'dyslexia' | 'sans';
  highContrast: boolean;
  reducedMotion: boolean;
  playMode: 'challenge' | 'relaxed' | 'endurance';
  timerMode: 'countdown' | 'unlimited';
}

export const DEFAULT_SETTINGS: AppSettings = {
  ttsEnabled: true,
  musicVolume: 0.1,
  sfxVolume: 0.5,
  voiceVolume: 0.7,
  fontSize: 'medium',
  fontFamily: 'mono',
  highContrast: false,
  reducedMotion: false,
  playMode: 'challenge',
  timerMode: 'countdown',
};

const VALID_CHOICES = {
  fontSize: ['small', 'medium', 'large'],
  fontFamily: ['mono', 'dyslexia', 'sans'],
  timerMode: ['countdown', 'unlimited'],
  playMode: ['challenge', 'relaxed', 'endurance'],
};

function validSetting(key: string, value: unknown, fallback: unknown) {
  if (typeof fallback !== typeof value) return false;
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 && value <= 1;
  const choices = VALID_CHOICES[key as keyof typeof VALID_CHOICES];
  return !choices || choices.includes(String(value));
}

export function parseSettings(raw: string | null): AppSettings {
  try {
    const stored = JSON.parse(raw || '{}');
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return DEFAULT_SETTINGS;
    const playMode = VALID_CHOICES.playMode.includes(stored.playMode) ? stored.playMode : stored.timerMode === 'unlimited' ? 'relaxed' : 'challenge';
    stored.playMode = playMode;
    stored.timerMode = playMode === 'challenge' ? 'countdown' : 'unlimited';
    return Object.fromEntries(Object.entries(DEFAULT_SETTINGS).map(([key, fallback]) =>
      [key, validSetting(key, stored[key], fallback) ? stored[key] : fallback])) as unknown as AppSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}
