'use client';
import { useSyncExternalStore } from 'react';
import { usePreferences } from '../settings/usePreferences';

const query = '(prefers-reduced-motion: reduce)';
function subscribe(update: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', update);
  return () => media.removeEventListener('change', update);
}
export function useMotionPreference(): boolean {
  const preferences = usePreferences();
  const system = useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
  return preferences.reducedMotion || system;
}
