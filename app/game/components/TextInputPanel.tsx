import { useRef, useCallback } from 'react';
import { motion, AnimatePresence, fadeUp, smooth } from '../../components/motion';

interface TextInputPanelProps {
  show: boolean;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
}

export default function TextInputPanel({ show, value, disabled, onChange, onSubmit }: TextInputPanelProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playKeystroke = useCallback(() => {
    try {
      let m = 0.5;
      try { const s = localStorage.getItem('appSettings'); if (s) m = JSON.parse(s).sfxVolume ?? 0.5; } catch {}
      if (m === 0) return;
      if (!audioRef.current) audioRef.current = new Audio('/efx/typewriter.mp3');
      const a = audioRef.current;
      a.currentTime = 0;
      a.volume = 0.18 * m;
      a.play().catch(() => {});
      setTimeout(() => { a.volume = 0; a.pause(); }, 100);
    } catch {}
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="text-input-panel"
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={smooth}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (value.trim() && !disabled) {
                onSubmit(value.trim());
                onChange('');
              }
            }}
            className="flex items-center gap-2 bg-surface-dark/95 backdrop-blur-sm border border-surface rounded-xl px-3 py-2 shadow-2xl"
          >
            <input
              type="text"
              value={value}
              onChange={(e) => { playKeystroke(); onChange(e.target.value); }}
              placeholder={!disabled ? 'Type a question and press Enter...' : '...'}
              disabled={disabled}
              autoFocus
              className="flex-1 bg-transparent px-2 py-1 text-sm text-foreground placeholder-gray-600 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
            />
            <motion.button
              type="submit"
              disabled={!value.trim() || disabled}
              className="px-3 py-1.5 text-xs uppercase tracking-wider bg-surface text-gray-400 hover:text-foreground hover:bg-surface-hover rounded-lg border border-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
            >
              Ask
            </motion.button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
