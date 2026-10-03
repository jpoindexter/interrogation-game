'use client';

import { useCallback, useSyncExternalStore } from 'react';

const getServerSnapshot = () => null;

function subscribe(listener: () => void) {
  window.addEventListener('storage', listener);
  window.addEventListener('settingsChanged', listener);
  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener('settingsChanged', listener);
  };
}

/** Stable primitive snapshots avoid hydration mismatches and cascading effects. */
export function useBrowserStorage(key: string, storage: 'local' | 'session' = 'local') {
  const getSnapshot = useCallback(() => {
    try {
      return (storage === 'local' ? localStorage : sessionStorage).getItem(key);
    } catch {
      return null;
    }
  }, [key, storage]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
