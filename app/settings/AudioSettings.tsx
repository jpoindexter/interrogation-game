import { motion, fadeIn, fadeUp, smooth } from '../components/motion';
import { playClick } from '../lib/sfx-utils';
import type { useSettingsPage } from './useSettingsPage';
type SettingsModel = ReturnType<typeof useSettingsPage>;

export function AudioSettings({ settings, update }: SettingsModel) {
  return <>
    <button type="button" onClick={() => update({ ttsEnabled: true, musicVolume: 0.05, sfxVolume: 0.15, voiceVolume: 0.8 })}
      className="min-h-11 border border-surface px-4 py-3 text-sm text-gold">Use screen-share audio levels</button>
    <p className="text-xs text-gray-400">Sets voice to 80%, music to 5%, and effects to 15%. Rehearse in your call app; this does not test audio routing.</p>
            {[
              { label: 'Voice Output (TTS)', desc: 'Suspect speaks responses aloud via ElevenLabs', key: 'ttsEnabled' as const },
              { label: 'Reduced Motion', desc: 'Reduce animation; your operating system preference also applies', key: 'reducedMotion' as const },
              { label: 'High Contrast', desc: 'Increase contrast for better readability', key: 'highContrast' as const },
            ].map(({ label, desc, key }) => (
              <motion.div key={key} variants={fadeUp} transition={smooth} className="bg-surface-darker border border-surface-dark rounded-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm text-gray-300 font-bold">{label}</h3>
                    <p className="text-xs text-gray-500 mt-1">{desc}</p>
                  </div>
                  <motion.button aria-label={label} role="switch" aria-checked={settings[key]} variants={fadeIn} onClick={() => { playClick(); update({ [key]: !settings[key] }); }} className={`w-12 h-6 rounded-full transition-colors relative ${settings[key] ? 'bg-accent' : 'bg-surface'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${settings[key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </motion.button>
                </div>
              </motion.div>
            ))}

            {[
              { label: 'Music Volume', desc: 'Background music during interrogation', key: 'musicVolume' as const },
              { label: 'Sound Effects Volume', desc: 'Interface sounds and room effects', key: 'sfxVolume' as const },
              { label: 'Voice Volume', desc: 'AI suspect and detective voice level', key: 'voiceVolume' as const },
            ].map(({ label, desc, key }) => (
              <motion.div key={key} variants={fadeUp} transition={smooth} className="bg-surface-darker border border-surface-dark rounded-sm p-6">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm text-gray-300 font-bold">{label}</h3>
                  <span className="text-xs text-gray-500 tabular-nums">{settings[key] === 0 ? 'Off' : `${Math.round(settings[key] * 100)}%`}</span>
                </div>
                <p className="text-xs text-gray-500 mb-4">{desc}</p>
                <input aria-label={label} type="range" min="0" max="1" step="0.05" value={settings[key]} onChange={(e) => update({ [key]: parseFloat(e.target.value) })} className="w-full h-1.5 bg-surface rounded-full appearance-none cursor-pointer accent-accent" />
              </motion.div>
            ))}

  </>;
}
