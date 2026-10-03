'use client';

import { useEffect } from 'react';
import { readPreferences } from '../settings/preferences-store';

const FONT_MAP: Record<string, string> = {
  dyslexia: '"OpenDyslexic", sans-serif',
  sans: 'system-ui, -apple-system, sans-serif',
};

export default function FontProvider() {
  useEffect(() => {
    const apply = () => {
      try {
        const { fontFamily, fontSize, highContrast, reducedMotion } = readPreferences();
        document.documentElement.style.fontSize = { small: '87.5%', medium: '100%', large: '125%' }[fontSize];
        document.body.classList.toggle('high-contrast', highContrast);
        document.body.classList.toggle('reduced-motion', reducedMotion);
        const font = FONT_MAP[fontFamily];
        if (font) {
          document.body.setAttribute('data-font', fontFamily);
          document.body.style.setProperty('--app-font', font);
        } else {
          document.body.removeAttribute('data-font');
          document.body.style.removeProperty('--app-font');
        }
      } catch {}
    };
    apply();
    window.addEventListener('storage', apply);
    window.addEventListener('settingsChanged', apply);
    return () => {
      window.removeEventListener('storage', apply);
      window.removeEventListener('settingsChanged', apply);
    };
  }, []);

  return null;
}
