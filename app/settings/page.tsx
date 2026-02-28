'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

  const update = (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    localStorage.setItem('appSettings', JSON.stringify(next));
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E8E8E8] font-mono relative">
      <button
        onClick={() => router.push('/')}
        className="absolute top-6 right-6 text-xs text-gray-500 hover:text-white uppercase tracking-wider transition-colors z-20"
      >
        &larr; Home
      </button>

      <div className="max-w-lg mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-[#C41E1E] mb-2">
            Configuration
          </p>
          <h1 className="text-4xl font-bold tracking-wide">SETTINGS</h1>
        </div>

        <div className="space-y-8">
          {/* Voice */}
          <div className="bg-[#111111] border border-[#1A1A1A] rounded-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm text-gray-300 font-bold">Voice Output (TTS)</h3>
                <p className="text-xs text-gray-500 mt-1">Suspect speaks responses aloud via ElevenLabs</p>
              </div>
              <button
                onClick={() => update({ ttsEnabled: !settings.ttsEnabled })}
                className={`w-12 h-6 rounded-full transition-colors relative ${settings.ttsEnabled ? 'bg-[#C41E1E]' : 'bg-[#2A2A2A]'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${settings.ttsEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Text Size */}
          <div className="bg-[#111111] border border-[#1A1A1A] rounded-sm p-6">
            <h3 className="text-sm text-gray-300 font-bold mb-1">Text Size</h3>
            <p className="text-xs text-gray-500 mb-4">Adjust in-game dialogue and UI text</p>
            <div className="flex gap-2">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => update({ fontSize: size })}
                  className={`flex-1 px-3 py-2 text-xs uppercase tracking-wider rounded-sm transition-colors ${
                    settings.fontSize === size ? 'bg-[#C41E1E] text-white' : 'bg-[#2A2A2A] text-gray-400 hover:text-[#E8E8E8]'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Font */}
          <div className="bg-[#111111] border border-[#1A1A1A] rounded-sm p-6">
            <h3 className="text-sm text-gray-300 font-bold mb-1">Font</h3>
            <p className="text-xs text-gray-500 mb-4">Choose your preferred typeface</p>
            <div className="flex gap-2">
              {([
                { key: 'mono' as const, label: 'Mono' },
                { key: 'dyslexia' as const, label: 'Dyslexia' },
                { key: 'sans' as const, label: 'Sans' },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => update({ fontFamily: key })}
                  className={`flex-1 px-3 py-2 text-xs uppercase tracking-wider rounded-sm transition-colors ${
                    settings.fontFamily === key ? 'bg-[#C41E1E] text-white' : 'bg-[#2A2A2A] text-gray-400 hover:text-[#E8E8E8]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* High Contrast */}
          <div className="bg-[#111111] border border-[#1A1A1A] rounded-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm text-gray-300 font-bold">High Contrast</h3>
                <p className="text-xs text-gray-500 mt-1">Increase contrast for better readability</p>
              </div>
              <button
                onClick={() => update({ highContrast: !settings.highContrast })}
                className={`w-12 h-6 rounded-full transition-colors relative ${settings.highContrast ? 'bg-[#C41E1E]' : 'bg-[#2A2A2A]'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${settings.highContrast ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={() => {
              setSettings(DEFAULT_SETTINGS);
              localStorage.setItem('appSettings', JSON.stringify(DEFAULT_SETTINGS));
            }}
            className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-wider transition-colors"
          >
            Reset to defaults
          </button>
        </div>
      </div>
    </div>
  );
}
