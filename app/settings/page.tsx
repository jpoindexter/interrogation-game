'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BackButton, PageShell, PageHeader } from '../components/ui';
import {
  motion,
  PageMotion,
  fadeIn,
  fadeUp,
  stagger,
  smooth,
} from '../components/motion';

interface AppSettings {
  ttsEnabled: boolean;
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: 'mono' | 'dyslexia' | 'sans';
  highContrast: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  ttsEnabled: true,
  fontSize: 'medium',
  fontFamily: 'mono',
  highContrast: false,
};

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const stored = localStorage.getItem('appSettings');
    if (stored) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      } catch { /* ignore */ }
    }
  }, []);

  // Apply settings live to the page
  useEffect(() => {
    const root = document.documentElement;
    root.style.fontFamily = settings.fontFamily === 'dyslexia' ? '"OpenDyslexic", sans-serif'
      : settings.fontFamily === 'sans' ? 'system-ui, -apple-system, sans-serif' : '';
    root.style.fontSize = settings.fontSize === 'small' ? '14px' : settings.fontSize === 'large' ? '18px' : '';
    root.classList.toggle('high-contrast', settings.highContrast);
    return () => { root.style.fontFamily = ''; root.style.fontSize = ''; root.classList.remove('high-contrast'); };
  }, [settings]);

  const update = (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    try { localStorage.setItem('appSettings', JSON.stringify(next)); } catch { /* private browsing */ }
  };

  return (
    <PageShell>
      <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={smooth}>
        <BackButton />
      </motion.div>
      <PageMotion>
        <div className="max-w-lg mx-auto px-6 py-12">
          <PageHeader label="Configuration" title="SETTINGS" />

          <motion.div
            className="space-y-8"
            variants={stagger(0.09)}
            initial="hidden"
            animate="visible"
          >
            {/* Voice */}
            <motion.div variants={fadeUp} transition={smooth} className="bg-surface-darker border border-surface-dark rounded-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm text-gray-300 font-bold">Voice Output (TTS)</h3>
                  <p className="text-xs text-gray-500 mt-1">Suspect speaks responses aloud via ElevenLabs</p>
                </div>
                <motion.button
                  variants={fadeIn}
                  onClick={() => update({ ttsEnabled: !settings.ttsEnabled })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${settings.ttsEnabled ? 'bg-accent' : 'bg-surface'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${settings.ttsEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </motion.button>
              </div>
            </motion.div>

            {/* Text Size */}
            <motion.div variants={fadeUp} transition={smooth} className="bg-surface-darker border border-surface-dark rounded-sm p-6">
              <h3 className="text-sm text-gray-300 font-bold mb-1">Text Size</h3>
              <p className="text-xs text-gray-500 mb-4">Adjust in-game dialogue and UI text</p>
              <div className="flex gap-2">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <motion.button
                    key={size}
                    whileHover={{ scale: 1.03 }}
                    onClick={() => update({ fontSize: size })}
                    className={`flex-1 px-3 py-2 text-xs uppercase tracking-wider rounded-sm transition-colors ${
                      settings.fontSize === size ? 'bg-accent text-white' : 'bg-surface text-gray-400 hover:text-foreground'
                    }`}
                  >
                    {size}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Font */}
            <motion.div variants={fadeUp} transition={smooth} className="bg-surface-darker border border-surface-dark rounded-sm p-6">
              <h3 className="text-sm text-gray-300 font-bold mb-1">Font</h3>
              <p className="text-xs text-gray-500 mb-4">Choose your preferred typeface</p>
              <div className="flex gap-2">
                {([
                  { key: 'mono' as const, label: 'Mono' },
                  { key: 'dyslexia' as const, label: 'Dyslexia' },
                  { key: 'sans' as const, label: 'Sans' },
                ]).map(({ key, label }) => (
                  <motion.button
                    key={key}
                    whileHover={{ scale: 1.03 }}
                    onClick={() => update({ fontFamily: key })}
                    className={`flex-1 px-3 py-2 text-xs uppercase tracking-wider rounded-sm transition-colors ${
                      settings.fontFamily === key ? 'bg-accent text-white' : 'bg-surface text-gray-400 hover:text-foreground'
                    }`}
                  >
                    {label}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* High Contrast */}
            <motion.div variants={fadeUp} transition={smooth} className="bg-surface-darker border border-surface-dark rounded-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm text-gray-300 font-bold">High Contrast</h3>
                  <p className="text-xs text-gray-500 mt-1">Increase contrast for better readability</p>
                </div>
                <motion.button
                  variants={fadeIn}
                  onClick={() => update({ highContrast: !settings.highContrast })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${settings.highContrast ? 'bg-accent' : 'bg-surface'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${settings.highContrast ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </motion.button>
              </div>
            </motion.div>

            {/* Reset */}
            <motion.button
              variants={fadeIn}
              whileHover={{ scale: 1.03 }}
              onClick={() => {
                setSettings(DEFAULT_SETTINGS);
                try { localStorage.setItem('appSettings', JSON.stringify(DEFAULT_SETTINGS)); } catch { /* private browsing */ }
              }}
              className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-wider transition-colors"
            >
              Reset to defaults
            </motion.button>
          </motion.div>
        </div>
      </PageMotion>
    </PageShell>
  );
}
