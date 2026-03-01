'use client';

import { useEffect } from 'react';

const FONT_MAP: Record<string, string> = {
  dyslexia: '"OpenDyslexic", sans-serif',
  sans: 'system-ui, -apple-system, sans-serif',
};

export default function FontProvider() {
  useEffect(() => {
    const apply = () => {
      try {
        const raw = localStorage.getItem('appSettings');
        if (!raw) return;
        const { fontFamily } = JSON.parse(raw);
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
