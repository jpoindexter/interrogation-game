import { useRef } from 'react';
import CloseIcon from './CloseIcon';
import { motion, AnimatePresence, fadeUp, stagger, smooth, snappy } from '../../components/motion';

export interface GameSettings {
  ttsEnabled: boolean;
  musicVolume: number; // 0 = off, 0-1 range
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: 'mono' | 'dyslexia' | 'sans';
  highContrast: boolean;
}

interface SettingsProps {
  show: boolean;
  settings: GameSettings;
  pos: { x: number; y: number } | null;
  onSettingsChange: (s: GameSettings) => void;
  onClose: () => void;
  onPosChange: (pos: { x: number; y: number }) => void;
}

export default function SettingsPanel({ show, settings, pos, onSettingsChange, onClose, onPosChange }: SettingsProps) {
  const update = (patch: Partial<GameSettings>) => onSettingsChange({ ...settings, ...patch });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="settings-panel"
          className="absolute z-40 w-[320px] bg-surface-darker border border-surface rounded-sm shadow-2xl"
          style={{
            left: pos ? pos.x : undefined,
            top: pos ? pos.y : undefined,
            right: pos ? undefined : 16,
            bottom: pos ? undefined : 80,
          }}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={snappy}
        >
          <div
            className="flex items-center justify-between px-4 py-2 border-b border-surface cursor-grab active:cursor-grabbing select-none"
            onMouseDown={(e) => {
              const panel = e.currentTarget.parentElement!;
              const rect = panel.getBoundingClientRect();
              const parentRect = panel.offsetParent!.getBoundingClientRect();
              dragRef.current = {
                startX: e.clientX, startY: e.clientY,
                origX: rect.left - parentRect.left, origY: rect.top - parentRect.top,
              };
              const onMove = (ev: MouseEvent) => {
                if (!dragRef.current) return;
                onPosChange({
                  x: dragRef.current.origX + (ev.clientX - dragRef.current.startX),
                  y: dragRef.current.origY + (ev.clientY - dragRef.current.startY),
                });
              };
              const onUp = () => {
                dragRef.current = null;
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
              };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
          >
            <span className="text-xs uppercase tracking-[0.2em] text-gray-500">Settings</span>
            <button onClick={onClose} className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-foreground transition-colors">
              <CloseIcon />
            </button>
          </div>
          <motion.div
            className="p-4 space-y-4"
            variants={stagger(0.06)}
            initial="hidden"
            animate="visible"
          >
            <motion.div className="flex items-center justify-between" variants={fadeUp} transition={smooth}>
              <span className="text-sm text-gray-300">Voice (TTS)</span>
              <motion.button
                onClick={() => update({ ttsEnabled: !settings.ttsEnabled })}
                className={`w-10 h-5 rounded-full transition-colors relative ${settings.ttsEnabled ? 'bg-accent' : 'bg-surface'}`}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${settings.ttsEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </motion.button>
            </motion.div>
            <motion.div className="space-y-1.5" variants={fadeUp} transition={smooth}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Music</span>
                <span className="text-[10px] text-gray-500 tabular-nums">{settings.musicVolume === 0 ? 'Off' : `${Math.round(settings.musicVolume * 100)}%`}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.musicVolume}
                onChange={(e) => update({ musicVolume: parseFloat(e.target.value) })}
                className="w-full h-1 bg-surface rounded-full appearance-none cursor-pointer accent-accent"
              />
            </motion.div>
            <motion.div variants={fadeUp} transition={smooth}>
              <span className="text-sm text-gray-300 block mb-2">Text Size</span>
              <div className="flex gap-1">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <motion.button
                    key={size}
                    onClick={() => update({ fontSize: size })}
                    className={`flex-1 px-2 py-1.5 text-xs uppercase tracking-wider rounded-sm transition-colors ${
                      settings.fontSize === size ? 'bg-accent text-white' : 'bg-surface text-gray-400 hover:text-foreground'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {size}
                  </motion.button>
                ))}
              </div>
            </motion.div>
            <motion.div variants={fadeUp} transition={smooth}>
              <span className="text-sm text-gray-300 block mb-2">Font</span>
              <div className="flex gap-1">
                {([{ key: 'mono', label: 'Mono' }, { key: 'dyslexia', label: 'Dyslexia' }, { key: 'sans', label: 'Sans' }] as const).map(({ key, label }) => (
                  <motion.button
                    key={key}
                    onClick={() => update({ fontFamily: key })}
                    className={`flex-1 px-2 py-1.5 text-xs uppercase tracking-wider rounded-sm transition-colors ${
                      settings.fontFamily === key ? 'bg-accent text-white' : 'bg-surface text-gray-400 hover:text-foreground'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
            <motion.div className="flex items-center justify-between" variants={fadeUp} transition={smooth}>
              <span className="text-sm text-gray-300">High Contrast</span>
              <motion.button
                onClick={() => update({ highContrast: !settings.highContrast })}
                className={`w-10 h-5 rounded-full transition-colors relative ${settings.highContrast ? 'bg-accent' : 'bg-surface'}`}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${settings.highContrast ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
