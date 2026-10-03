export interface AudioLevels { musicVolume: number; sfxVolume: number; voiceVolume: number }
/** Preserve intentional per-channel silence when restoring from master mute. */
export function audioLevels(settings: AudioLevels): AudioLevels {
  return { musicVolume: settings.musicVolume, sfxVolume: settings.sfxVolume, voiceVolume: settings.voiceVolume };
}
export function isAudioMuted(settings: AudioLevels): boolean {
  return settings.musicVolume === 0 && settings.sfxVolume === 0 && settings.voiceVolume === 0;
}
