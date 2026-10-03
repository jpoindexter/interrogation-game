import { useRef, useCallback, useEffect } from 'react';
import { SFX, FADE_CONFIG } from './sfx-registry';
import type { SfxName } from './sfx-registry';
import { AudioResource } from '../../hooks/audio-resource';
import { readPreferences } from '../../settings/preferences-store';
export type { SfxName };

function applyEnvelope(resource: AudioResource, name: SfxName, volume: number) {
  if (name === 'tension') {
    resource.audio.volume = 0;
    resource.fade(0.12 * volume, 400, () => {
      resource.schedule(() => resource.fade(0, 500, () => resource.dispose()), 600);
    });
    return;
  }
  const fade = FADE_CONFIG[name];
  if (fade) resource.schedule(() => resource.fade(0, fade.duration, () => resource.dispose()), fade.delay);
}

export function useSfx() {
  const resources = useRef(new Map<SfxName, AudioResource>());
  const volumeRef = useRef(0.5);
  useEffect(() => {
    const active = resources.current;
    const sync = () => {
      try { volumeRef.current = readPreferences().sfxVolume; } catch { volumeRef.current = 0.5; }
      if (!volumeRef.current) { active.forEach(resource => resource.dispose()); active.clear(); }
    };
    sync();
    window.addEventListener('settingsChanged', sync);
    return () => {
      window.removeEventListener('settingsChanged', sync);
      active.forEach(resource => resource.dispose());
      active.clear();
    };
  }, []);
  return useCallback((name: SfxName) => {
    const entry = SFX[name];
    const volume = volumeRef.current;
    if (!entry || !volume) return;
    resources.current.get(name)?.dispose();
    const resource = new AudioResource(new Audio(entry.src));
    resources.current.set(name, resource);
    resource.audio.volume = entry.vol * volume;
    void resource.play();
    resource.listen('ended', () => resource.dispose());
    applyEnvelope(resource, name, volume);
  }, []);
}
