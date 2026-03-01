import { useRef } from 'react';
import CloseIcon from './CloseIcon';
import { motion, AnimatePresence, fadeUp, stagger, smooth, snappy } from '../../components/motion';

export interface GameSettings {
  ttsEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  voiceVolume: number;
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: 'mono' | 'dyslexia' | 'sans';
  highContrast: boolean;
}

interface SettingsProps {
  show: boolean; settings: GameSettings; pos: { x: number; y: number } | null;
  onSettingsChange: (s: GameSettings) => void; onClose: () => void; onPosChange: (pos: { x: number; y: number }) => void;
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <motion.button onClick={onToggle} className={`w-10 h-5 rounded-full transition-colors relative ${on ? 'bg-accent' : 'bg-surface'}`} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </motion.button>
  );
}

function Slider({ label, value, fallback, onChange }: { label: string; value: number; fallback: number; onChange: (v: number) => void }) {
  const v = value ?? fallback;
  return (
    <motion.div className="space-y-1.5" variants={fadeUp} transition={smooth}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-300">{label}</span>
        <span className="text-[10px] text-gray-500 tabular-nums">{v === 0 ? 'Off' : `${Math.round(v * 100)}%`}</span>
      </div>
      <input type="range" min="0" max="1" step="0.05" value={v} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full h-1 bg-surface rounded-full appearance-none cursor-pointer accent-accent" />
    </motion.div>
  );
}

function ButtonGroup<T extends string>({ label, items, active, onSelect }: { label: string; items: { key: T; label: string }[]; active: T; onSelect: (k: T) => void }) {
  return (
    <motion.div variants={fadeUp} transition={smooth}>
      <span className="text-sm text-gray-300 block mb-2">{label}</span>
      <div className="flex gap-1">
        {items.map(({ key, label: l }) => (
          <motion.button key={key} onClick={() => onSelect(key)} className={`flex-1 px-2 py-1.5 text-xs uppercase tracking-wider rounded-sm transition-colors ${active === key ? 'bg-accent text-white' : 'bg-surface text-gray-400 hover:text-foreground'}`} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>{l}</motion.button>
        ))}
      </div>
    </motion.div>
  );
}

export default function SettingsPanel({ show, settings, pos, onSettingsChange, onClose, onPosChange }: SettingsProps) {
  const update = (patch: Partial<GameSettings>) => onSettingsChange({ ...settings, ...patch });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const startDrag = (e: React.MouseEvent) => {
    const panel = e.currentTarget.parentElement!;
    const rect = panel.getBoundingClientRect();
    const parentRect = panel.offsetParent!.getBoundingClientRect();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: rect.left - parentRect.left, origY: rect.top - parentRect.top };
    const onMove = (ev: MouseEvent) => { if (!dragRef.current) return; onPosChange({ x: dragRef.current.origX + (ev.clientX - dragRef.current.startX), y: dragRef.current.origY + (ev.clientY - dragRef.current.startY) }); };
    const onUp = () => { dragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <AnimatePresence>
      {show && (<>
        <div key="settings-backdrop" className="fixed inset-0 z-39" onClick={onClose} />
        <motion.div key="settings-panel" className="absolute z-40 w-[320px] bg-surface-darker border border-surface rounded-sm shadow-2xl" style={{ left: pos?.x, top: pos?.y, right: pos ? undefined : 16, bottom: pos ? undefined : 80 }} variants={fadeUp} initial="hidden" animate="visible" exit="hidden" transition={snappy}>
          <div className="flex items-center justify-between px-4 py-2 border-b border-surface cursor-grab active:cursor-grabbing select-none" onMouseDown={startDrag}>
            <span className="text-xs uppercase tracking-[0.2em] text-gray-500">Settings</span>
            <button onClick={onClose} className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-foreground transition-colors"><CloseIcon /></button>
          </div>
          <motion.div className="p-4 space-y-4" variants={stagger(0.06)} initial="hidden" animate="visible">
            <motion.div className="flex items-center justify-between" variants={fadeUp} transition={smooth}>
              <span className="text-sm text-gray-300">Voice (TTS)</span>
              <Toggle on={settings.ttsEnabled} onToggle={() => update({ ttsEnabled: !settings.ttsEnabled })} />
            </motion.div>
            <Slider label="Music" value={settings.musicVolume} fallback={0.1} onChange={(v) => update({ musicVolume: v })} />
            <Slider label="Sound Effects" value={settings.sfxVolume} fallback={0.5} onChange={(v) => update({ sfxVolume: v })} />
            <Slider label="Voice Volume" value={settings.voiceVolume} fallback={0.7} onChange={(v) => update({ voiceVolume: v })} />
            <ButtonGroup label="Text Size" items={[{ key: 'small', label: 'Small' }, { key: 'medium', label: 'Medium' }, { key: 'large', label: 'Large' }]} active={settings.fontSize} onSelect={(v) => update({ fontSize: v as GameSettings['fontSize'] })} />
            <ButtonGroup label="Font" items={[{ key: 'mono', label: 'Mono' }, { key: 'dyslexia', label: 'Dyslexia' }, { key: 'sans', label: 'Sans' }]} active={settings.fontFamily} onSelect={(v) => update({ fontFamily: v as GameSettings['fontFamily'] })} />
            <motion.div className="flex items-center justify-between" variants={fadeUp} transition={smooth}>
              <span className="text-sm text-gray-300">High Contrast</span>
              <Toggle on={settings.highContrast} onToggle={() => update({ highContrast: !settings.highContrast })} />
            </motion.div>
          </motion.div>
        </motion.div>
      </>)}
    </AnimatePresence>
  );
}
