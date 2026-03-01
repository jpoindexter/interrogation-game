import { useRef, useCallback } from 'react';
import { motion, AnimatePresence, fadeUp, smooth } from '../../components/motion';

interface TextInputPanelProps {
  show: boolean;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  onMic?: () => void;
  onClickOutside?: () => void;
}

export default function TextInputPanel({ show, value, disabled, onChange, onSubmit, onMic, onClickOutside }: TextInputPanelProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playKeystroke = useCallback(() => {
    try {
      let m = 0.5;
      try { const s = localStorage.getItem('appSettings'); if (s) m = JSON.parse(s).sfxVolume ?? 0.5; } catch {}
      if (m === 0) return;
      if (!audioRef.current) audioRef.current = new Audio('/efx/typewriter.mp3');
      const a = audioRef.current;
      a.currentTime = 0;
      a.volume = 0.25 * m;
      a.play().catch(() => {});
      setTimeout(() => { a.volume = 0; a.pause(); }, 100);
    } catch {}
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <>
        {onClickOutside && <div key="text-input-backdrop" className="fixed inset-0 z-29" onClick={onClickOutside} />}
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
              title="Send question"
            >
              Ask
            </motion.button>
            {onMic && (
              <motion.button
                type="button"
                onClick={onMic}
                disabled={disabled}
                className="px-2 py-1.5 text-gray-500 hover:text-foreground transition-colors disabled:opacity-30"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                title="Switch to voice"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                </svg>
              </motion.button>
            )}
          </form>
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
