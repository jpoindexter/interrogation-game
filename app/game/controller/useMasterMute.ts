import { useRef } from 'react';
import type { GameSettings } from '../components/SettingsPanel';
import { audioLevels, isAudioMuted } from './audio-levels';

export function useMasterMute(settings: GameSettings, update: (settings: GameSettings) => void) {
  const previous = useRef({ musicVolume: 0.05, sfxVolume: 0.5, voiceVolume: 0.7 });
  return () => {
    if (!isAudioMuted(settings)) {
      previous.current = audioLevels(settings);
      update({ ...settings, musicVolume: 0, sfxVolume: 0, voiceVolume: 0 });
    } else update({ ...settings, ...previous.current });
  };
}
