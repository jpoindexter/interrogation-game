import { useId, useState } from 'react';
import FloatingPanel from './panels/FloatingPanel';
import { motion, fadeUp, smooth } from '../../components/motion';

export interface GameSettings {
  ttsEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  voiceVolume: number;
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: 'mono' | 'dyslexia' | 'sans';
  highContrast: boolean;
  reducedMotion: boolean;
}

interface SettingsProps {
  show: boolean; settings: GameSettings; pos: { x: number; y: number } | null;
  onSettingsChange: (s: GameSettings) => boolean | void; onClose: () => void; onPosChange: (pos: { x: number; y: number }) => void;
}

function Toggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <motion.button role="switch" aria-label={label} aria-checked={on} onClick={onToggle} className={`w-10 h-5 rounded-full transition-colors relative ${on ? 'bg-accent' : 'bg-surface'}`} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </motion.button>
  );
}

function Slider({ label, value, fallback, onChange }: { label: string; value: number; fallback: number; onChange: (v: number) => void }) {
  const v = value ?? fallback;
  const id = useId();
  return (
    <motion.div className="space-y-1.5" variants={fadeUp} transition={smooth}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm text-gray-300">{label}</label>
        <span className="text-[10px] text-gray-500 tabular-nums">{v === 0 ? 'Off' : `${Math.round(v * 100)}%`}</span>
      </div>
      <input id={id} aria-valuetext={v === 0 ? 'Off' : `${Math.round(v * 100)} percent`} type="range" min="0" max="1" step="0.05" value={v} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full h-1 bg-surface rounded-full appearance-none cursor-pointer accent-accent" />
    </motion.div>
  );
}

function ButtonGroup<T extends string>({ label, items, active, onSelect }: { label: string; items: { key: T; label: string }[]; active: T; onSelect: (k: T) => void }) {
  return (
    <motion.div variants={fadeUp} transition={smooth}>
      <span className="text-sm text-gray-300 block mb-2">{label}</span>
      <div className="flex gap-1">
        {items.map(({ key, label: l }) => (
          <motion.button key={key} aria-pressed={active === key} onClick={() => onSelect(key)} className={`flex-1 px-2 py-1.5 text-xs uppercase tracking-wider rounded-sm transition-colors ${active === key ? 'bg-accent text-white' : 'bg-surface text-gray-400 hover:text-foreground'}`} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>{l}</motion.button>
        ))}
      </div>
    </motion.div>
  );
}

export default function SettingsPanel({ show, settings, pos, onSettingsChange, onClose, onPosChange }: SettingsProps) {
  const [saveError, setSaveError] = useState(false);
  const update = (patch: Partial<GameSettings>) => setSaveError(onSettingsChange({ ...settings, ...patch }) === false);
  if (!show) return null;
  return <FloatingPanel title="Settings" pos={pos} onPosition={onPosChange} onClose={onClose} width={340}>
    <div className="space-y-4 p-4">
      {saveError && <p role="alert" className="text-sm text-warn">Settings could not be saved. Enable browser storage and try again.</p>}
      <div className="flex items-center justify-between gap-3"><span>Spoken responses</span>
        <Toggle label="Spoken responses" on={settings.ttsEnabled} onToggle={() => update({ ttsEnabled: !settings.ttsEnabled })} /></div>
      <Slider label="Music" value={settings.musicVolume} fallback={0.1} onChange={musicVolume => update({ musicVolume })} />
      <Slider label="Sound effects" value={settings.sfxVolume} fallback={0.5} onChange={sfxVolume => update({ sfxVolume })} />
      <Slider label="Voice volume" value={settings.voiceVolume} fallback={0.7} onChange={voiceVolume => update({ voiceVolume })} />
      <ButtonGroup label="Text size" items={[{ key: 'small', label: 'Small' }, { key: 'medium', label: 'Medium' }, { key: 'large', label: 'Large' }]} active={settings.fontSize} onSelect={fontSize => update({ fontSize })} />
      <ButtonGroup label="Font" items={[{ key: 'mono', label: 'Mono' }, { key: 'dyslexia', label: 'Dyslexia' }, { key: 'sans', label: 'Sans' }]} active={settings.fontFamily} onSelect={fontFamily => update({ fontFamily })} />
      <div className="flex items-center justify-between gap-3"><span>High contrast</span>
        <Toggle label="High contrast" on={settings.highContrast} onToggle={() => update({ highContrast: !settings.highContrast })} /></div>
      <div className="flex items-center justify-between gap-3"><span>Reduced motion</span>
        <Toggle label="Reduced motion" on={settings.reducedMotion} onToggle={() => update({ reducedMotion: !settings.reducedMotion })} /></div>
    </div>
  </FloatingPanel>;
}
