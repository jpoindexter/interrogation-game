'use client';

import { useState, useEffect, useCallback } from 'react';
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
  timerMode: 'countdown' | 'unlimited';
  mistralApiKey: string;
  elevenlabsApiKey: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  ttsEnabled: true,
  musicVolume: 0.1,
  sfxVolume: 0.5,
  voiceVolume: 0.7,
  fontSize: 'medium',
  fontFamily: 'mono',
  highContrast: false,
  timerMode: 'countdown',
  mistralApiKey: '',
  elevenlabsApiKey: '',
  supabaseUrl: '',
  supabaseAnonKey: '',
};

type KeyStatus = 'idle' | 'testing' | 'valid' | 'invalid';

function KeyStatusLabel({ status }: { status: KeyStatus }) {
  if (status === 'idle') return <span className="text-[10px] text-gray-600 uppercase tracking-wider">Not set</span>;
  if (status === 'testing') return <span className="text-[10px] text-gray-500 uppercase tracking-wider animate-pulse">Testing...</span>;
  if (status === 'valid') return <span className="text-[10px] text-diff-easy uppercase tracking-wider">Connected</span>;
  return <span className="text-[10px] text-accent uppercase tracking-wider">Invalid</span>;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [exportCount, setExportCount] = useState<number | null>(null);
  const [mistralStatus, setMistralStatus] = useState<KeyStatus>('idle');
  const [elevenlabsStatus, setElevenlabsStatus] = useState<KeyStatus>('idle');
  const [supabaseStatus, setSupabaseStatus] = useState<KeyStatus>('idle');

  const testKey = useCallback(async (url: string, headers: Record<string, string>, setStatus: (s: KeyStatus) => void) => {
    setStatus('testing');
    try { const r = await fetch(url, { headers }); setStatus(r.ok ? 'valid' : 'invalid'); }
    catch { setStatus('invalid'); }
  }, []);
  const testMistral = useCallback((key: string) => key ? testKey('https://api.mistral.ai/v1/models', { Authorization: `Bearer ${key}` }, setMistralStatus) : setMistralStatus('idle'), [testKey]);
  const testElevenlabs = useCallback((key: string) => key ? testKey('https://api.elevenlabs.io/v1/user', { 'xi-api-key': key }, setElevenlabsStatus) : setElevenlabsStatus('idle'), [testKey]);
  const testSupabase = useCallback((url: string, anonKey: string) => (url && anonKey) ? testKey(`${url.replace(/\/$/, '')}/rest/v1/`, { apikey: anonKey, Authorization: `Bearer ${anonKey}` }, setSupabaseStatus) : setSupabaseStatus('idle'), [testKey]);

  useEffect(() => {
    const stored = localStorage.getItem('appSettings');
    if (stored) {
      try {
        const p = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        setSettings(p);
        if (p.mistralApiKey) testMistral(p.mistralApiKey);
        if (p.elevenlabsApiKey) testElevenlabs(p.elevenlabsApiKey);
        if (p.supabaseUrl && p.supabaseAnonKey) testSupabase(p.supabaseUrl, p.supabaseAnonKey);
      } catch { /* ignore */ }
    }
  }, [testMistral, testElevenlabs, testSupabase]);

  const update = (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    try { localStorage.setItem('appSettings', JSON.stringify(next)); } catch { /* private browsing */ }
    window.dispatchEvent(new Event('settingsChanged'));
  };

  const hasSupabase = !!(settings.supabaseUrl && settings.supabaseAnonKey);

  const handleExport = async () => {
    playClick();
    setExportStatus('loading');
    setExportCount(null);
    try {
      const base = settings.supabaseUrl.replace(/\/$/, '');
      const res = await fetch(`${base}/rest/v1/game_exports?select=*&order=created_at.desc&limit=1000`, {
        headers: { apikey: settings.supabaseAnonKey, Authorization: `Bearer ${settings.supabaseAnonKey}` },
      });
      if (!res.ok) { setExportStatus('error'); return; }
      const data = await res.json();
      setExportCount(data.length);
      if (data.length === 0) { setExportStatus('done'); return; }
      const blob = new Blob([data.map((r: Record<string, unknown>) => JSON.stringify(r)).join('\n')], { type: 'application/x-ndjson' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `interrogation_export_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.jsonl`;
      a.click();
      URL.revokeObjectURL(a.href);
      setExportStatus('done');
    } catch { setExportStatus('error'); }
  };

  const handleReset = () => {
    playClick();
    setSettings(DEFAULT_SETTINGS);
    setMistralStatus('idle');
    setElevenlabsStatus('idle');
    setSupabaseStatus('idle');
    try { localStorage.setItem('appSettings', JSON.stringify(DEFAULT_SETTINGS)); } catch { /* private browsing */ }
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
            {[
              { label: 'Voice Output (TTS)', desc: 'Suspect speaks responses aloud via ElevenLabs', key: 'ttsEnabled' as const },
              { label: 'High Contrast', desc: 'Increase contrast for better readability', key: 'highContrast' as const },
            ].map(({ label, desc, key }) => (
              <motion.div key={key} variants={fadeUp} transition={smooth} className="bg-surface-darker border border-surface-dark rounded-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm text-gray-300 font-bold">{label}</h3>
                    <p className="text-xs text-gray-500 mt-1">{desc}</p>
                  </div>
                  <motion.button variants={fadeIn} onClick={() => { playClick(); update({ [key]: !settings[key] }); }} className={`w-12 h-6 rounded-full transition-colors relative ${settings[key] ? 'bg-accent' : 'bg-surface'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${settings[key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </motion.button>
                </div>
              </motion.div>
            ))}

            {[
              { label: 'Music Volume', desc: 'Background music during interrogation', key: 'musicVolume' as const },
              { label: 'Voice Volume', desc: 'AI suspect and detective voice level', key: 'voiceVolume' as const },
            ].map(({ label, desc, key }) => (
              <motion.div key={key} variants={fadeUp} transition={smooth} className="bg-surface-darker border border-surface-dark rounded-sm p-6">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm text-gray-300 font-bold">{label}</h3>
                  <span className="text-xs text-gray-500 tabular-nums">{settings[key] === 0 ? 'Off' : `${Math.round(settings[key] * 100)}%`}</span>
                </div>
                <p className="text-xs text-gray-500 mb-4">{desc}</p>
                <input type="range" min="0" max="1" step="0.05" value={settings[key]} onChange={(e) => update({ [key]: parseFloat(e.target.value) })} className="w-full h-1.5 bg-surface rounded-full appearance-none cursor-pointer accent-accent" />
              </motion.div>
            ))}

            <motion.div variants={fadeUp} transition={smooth} className="bg-surface-darker border border-surface-dark rounded-sm p-6">
              <h3 className="text-sm text-gray-300 font-bold mb-1">Text Size</h3>
              <p className="text-xs text-gray-500 mb-4">Adjust in-game dialogue and UI text</p>
              <div className="flex gap-2">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <motion.button key={size} whileHover={{ scale: 1.03 }} onClick={() => { playClick(); update({ fontSize: size }); }} className={`flex-1 px-3 py-2 text-xs uppercase tracking-wider rounded-sm transition-colors ${settings.fontSize === size ? 'bg-accent text-white' : 'bg-surface text-gray-400 hover:text-foreground'}`}>
                    {size}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            <motion.div variants={fadeUp} transition={smooth} className="bg-surface-darker border border-surface-dark rounded-sm p-6">
              <h3 className="text-sm text-gray-300 font-bold mb-1">Font</h3>
              <p className="text-xs text-gray-500 mb-4">Choose your preferred typeface</p>
              <div className="flex gap-2">
                {([{ key: 'mono' as const, label: 'Mono' }, { key: 'dyslexia' as const, label: 'Dyslexia' }, { key: 'sans' as const, label: 'Sans' }]).map(({ key, label }) => (
                  <motion.button key={key} whileHover={{ scale: 1.03 }} onClick={() => { playClick(); update({ fontFamily: key }); }} className={`flex-1 px-3 py-2 text-xs uppercase tracking-wider rounded-sm transition-colors ${settings.fontFamily === key ? 'bg-accent text-white' : 'bg-surface text-gray-400 hover:text-foreground'}`}>
                    {label}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            <motion.div variants={fadeUp} transition={smooth} className="bg-surface-darker border border-surface-dark rounded-sm p-6">
              <h3 className="text-sm text-gray-300 font-bold mb-1">Timer Mode</h3>
              <p className="text-xs text-gray-500 mb-4">Countdown is the real challenge with higher scoring. Unlimited removes time pressure for exploration.</p>
              <div className="flex gap-2">
                {([
                  { key: 'countdown' as const, label: 'Countdown' },
                  { key: 'unlimited' as const, label: 'Unlimited' },
                ]).map(({ key, label }) => (
                  <motion.button
                    key={key}
                    whileHover={{ scale: 1.03 }}
                    onClick={() => { playClick(); update({ timerMode: key }); }}
                    className={`flex-1 px-3 py-2 text-xs uppercase tracking-wider rounded-sm transition-colors ${
                      settings.timerMode === key ? 'bg-accent text-white' : 'bg-surface text-gray-400 hover:text-foreground'
                    }`}
                  >
                    {label}
                  </motion.button>
                ))}
              </div>
              {settings.timerMode === 'unlimited' && (
                <p className="text-xs text-warn mt-3">Heads up — unlimited mode uses more API credits (ElevenLabs TTS, Mistral). The AI suspect is also tougher without time pressure.</p>
              )}
            </motion.div>

            <motion.div variants={fadeUp} transition={smooth} className="bg-surface-darker border border-surface-dark rounded-sm p-6">
              <h3 className="text-sm text-gray-300 font-bold mb-1">API Keys</h3>
              <p className="text-xs text-gray-500 mb-4">Provide your own API keys to play. Stored locally in your browser — never sent to third parties.</p>
              <div className="space-y-4">
                {[
                  { label: 'Mistral API Key', key: 'mistralApiKey' as const, placeholder: 'sk-...', type: 'password' as const, status: mistralStatus, onTest: () => testMistral(settings.mistralApiKey), onReset: () => setMistralStatus('idle'), canTest: !!settings.mistralApiKey },
                  { label: 'ElevenLabs API Key', key: 'elevenlabsApiKey' as const, placeholder: 'sk_...', type: 'password' as const, status: elevenlabsStatus, onTest: () => testElevenlabs(settings.elevenlabsApiKey), onReset: () => setElevenlabsStatus('idle'), canTest: !!settings.elevenlabsApiKey },
                  { label: 'Supabase URL', key: 'supabaseUrl' as const, placeholder: 'https://xxxxx.supabase.co', type: 'text' as const, status: supabaseStatus, onReset: () => setSupabaseStatus('idle') },
                  { label: 'Supabase Anon Key', key: 'supabaseAnonKey' as const, placeholder: 'eyJ...', type: 'password' as const, onTest: () => testSupabase(settings.supabaseUrl, settings.supabaseAnonKey), onReset: () => setSupabaseStatus('idle'), canTest: !!(settings.supabaseUrl && settings.supabaseAnonKey) },
                ].map(({ label, key, placeholder, type, status, onTest, onReset, canTest }) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs text-gray-500 uppercase tracking-wider">{label}</label>
                      {status && <KeyStatusLabel status={status} />}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type={type}
                        placeholder={placeholder}
                        value={settings[key]}
                        onChange={(e) => { update({ [key]: e.target.value.trim() }); onReset(); }}
                        className="flex-1 bg-surface border border-surface-dark rounded-sm px-3 py-2 text-xs text-foreground placeholder-gray-600 focus:outline-none focus:border-accent transition-colors"
                        autoComplete="off"
                        spellCheck={false}
                      />
                      {onTest && (
                        <button
                          onClick={() => { playClick(); onTest(); }}
                          disabled={!canTest || status === 'testing'}
                          className="px-3 py-2 bg-surface border border-surface-dark rounded-sm text-[10px] text-gray-400 uppercase tracking-wider hover:text-foreground hover:border-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          Test
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div variants={fadeUp} transition={smooth} className="bg-surface-darker border border-surface-dark rounded-sm p-6">
              <h3 className="text-sm text-gray-300 font-bold mb-1">Export Training Data</h3>
              <p className="text-xs text-gray-500 mb-4">Download completed game sessions as JSONL for fine-tuning. Full transcripts, case secrets, outcomes, and player stats.</p>
              {!hasSupabase ? (
                <p className="text-xs text-gray-600 uppercase tracking-wider">Configure Supabase to export</p>
              ) : (
                <div className="flex items-center gap-3">
                  <button disabled={exportStatus === 'loading'} onClick={handleExport} className="px-4 py-2 bg-gold text-black text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-gold-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    {exportStatus === 'loading' ? 'Exporting...' : 'Download Training Data'}
                  </button>
                  {exportStatus === 'done' && exportCount !== null && (
                    <span className="text-xs text-diff-easy">{exportCount === 0 ? 'No games recorded yet' : `${exportCount} game${exportCount === 1 ? '' : 's'} exported`}</span>
                  )}
                  {exportStatus === 'error' && <span className="text-xs text-accent">Failed to fetch data</span>}
                </div>
              )}
            </motion.div>

            <motion.button variants={fadeIn} whileHover={{ scale: 1.03 }} onClick={handleReset} className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-wider transition-colors">
              Reset to defaults
            </motion.button>
          </motion.div>
        </div>
      </PageMotion>
    </PageShell>
  );
}
