'use client';

import { useState, useEffect } from 'react';
import { BackButton, PageShell, PageHeader } from '../components/ui';
import { playClick } from '../lib/sfx-utils';
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
  musicVolume: number;
  sfxVolume: number;
  voiceVolume: number;
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: 'mono' | 'dyslexia' | 'sans';
  highContrast: boolean;
  mistralApiKey: string;
  elevenlabsApiKey: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  ttsEnabled: true,
  musicVolume: 0.1,
  sfxVolume: 0.5,
  voiceVolume: 0.7,
  fontSize: 'medium',
  fontFamily: 'mono',
  highContrast: false,
  mistralApiKey: '',
  elevenlabsApiKey: '',
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const stored = localStorage.getItem('appSettings');
    if (stored) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      } catch { /* ignore */ }
    }
  }, []);

  const update = (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    try { localStorage.setItem('appSettings', JSON.stringify(next)); } catch { /* private browsing */ }
    window.dispatchEvent(new Event('settingsChanged'));
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
                  onClick={() => { playClick(); update({ ttsEnabled: !settings.ttsEnabled }); }}
                  className={`w-12 h-6 rounded-full transition-colors relative ${settings.ttsEnabled ? 'bg-accent' : 'bg-surface'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${settings.ttsEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </motion.button>
              </div>
            </motion.div>

            {/* Music Volume */}
            <motion.div variants={fadeUp} transition={smooth} className="bg-surface-darker border border-surface-dark rounded-sm p-6">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm text-gray-300 font-bold">Music Volume</h3>
                <span className="text-xs text-gray-500 tabular-nums">{settings.musicVolume === 0 ? 'Off' : `${Math.round(settings.musicVolume * 100)}%`}</span>
              </div>
              <p className="text-xs text-gray-500 mb-4">Background music during interrogation</p>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.musicVolume}
                onChange={(e) => update({ musicVolume: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-surface rounded-full appearance-none cursor-pointer accent-accent"
              />
            </motion.div>

            {/* Voice Volume */}
            <motion.div variants={fadeUp} transition={smooth} className="bg-surface-darker border border-surface-dark rounded-sm p-6">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm text-gray-300 font-bold">Voice Volume</h3>
                <span className="text-xs text-gray-500 tabular-nums">{settings.voiceVolume === 0 ? 'Off' : `${Math.round(settings.voiceVolume * 100)}%`}</span>
              </div>
              <p className="text-xs text-gray-500 mb-4">AI suspect and detective voice level</p>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.voiceVolume}
                onChange={(e) => update({ voiceVolume: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-surface rounded-full appearance-none cursor-pointer accent-accent"
              />
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
                    onClick={() => { playClick(); update({ fontSize: size }); }}
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
                    onClick={() => { playClick(); update({ fontFamily: key }); }}
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
                  onClick={() => { playClick(); update({ highContrast: !settings.highContrast }); }}
                  className={`w-12 h-6 rounded-full transition-colors relative ${settings.highContrast ? 'bg-accent' : 'bg-surface'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${settings.highContrast ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </motion.button>
              </div>
            </motion.div>

            {/* API Keys */}
            <motion.div variants={fadeUp} transition={smooth} className="bg-surface-darker border border-surface-dark rounded-sm p-6">
              <h3 className="text-sm text-gray-300 font-bold mb-1">API Keys</h3>
              <p className="text-xs text-gray-500 mb-4">Use your own keys instead of the shared server keys. Stored locally in your browser only.</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">Mistral API Key</label>
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={settings.mistralApiKey}
                    onChange={(e) => update({ mistralApiKey: e.target.value.trim() })}
                    className="w-full bg-surface border border-surface-dark rounded-sm px-3 py-2 text-xs text-foreground placeholder-gray-600 focus:outline-none focus:border-accent transition-colors"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">ElevenLabs API Key</label>
                  <input
                    type="password"
                    placeholder="sk_..."
                    value={settings.elevenlabsApiKey}
                    onChange={(e) => update({ elevenlabsApiKey: e.target.value.trim() })}
                    className="w-full bg-surface border border-surface-dark rounded-sm px-3 py-2 text-xs text-foreground placeholder-gray-600 focus:outline-none focus:border-accent transition-colors"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
              </div>
            </motion.div>

            {/* Reset */}
            <motion.button
              variants={fadeIn}
              whileHover={{ scale: 1.03 }}
              onClick={() => {
                playClick();
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
