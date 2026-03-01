import { useRef, useCallback } from 'react';
import { motion, AnimatePresence, fadeUp, smooth } from '../../components/motion';

interface AccuseConfirmProps {
  show: boolean;
  accusationsLeft: number;
  accuseText: string;
  onChange: (v: string) => void;
  onSubmitText: (v: string) => void;
  onVoice: () => void;
  onCancel: () => void;
  onClickOutside?: () => void;
}

export default function AccuseConfirmDialog({ show, accusationsLeft, accuseText, onChange, onSubmitText, onVoice, onCancel, onClickOutside }: AccuseConfirmProps) {
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
        <div key="accuse-backdrop" className="fixed inset-0 z-39" onClick={onClickOutside || onCancel} />
        <motion.div
          key="accuse-panel"
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={smooth}
        >
          <div className="text-center mb-2">
            <span className="text-[10px] uppercase tracking-wider text-accent font-bold">
              Accusation — {accusationsLeft} attempt{accusationsLeft !== 1 ? 's' : ''} left
            </span>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (accuseText.trim()) onSubmitText(accuseText.trim());
            }}
            className="flex items-center gap-2 bg-surface-dark/95 backdrop-blur-sm border border-accent rounded-xl px-3 py-2 shadow-2xl shadow-accent/10"
          >
            <input
              type="text"
              value={accuseText}
              onChange={(e) => { playKeystroke(); onChange(e.target.value); }}
              placeholder="What did they lie about? Be specific..."
              autoFocus
              className="flex-1 bg-transparent px-2 py-1 text-sm text-foreground placeholder-gray-600 focus:outline-none"
            />
            <motion.button
              type="submit"
              disabled={!accuseText.trim()}
              className="px-3 py-1.5 text-xs uppercase tracking-wider bg-accent text-white hover:bg-accent-hover rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
            >
              Accuse
            </motion.button>
            <motion.button
              type="button"
              onClick={onVoice}
              className="px-3 py-1.5 text-xs uppercase tracking-wider bg-surface text-gray-400 hover:text-foreground hover:bg-surface-hover rounded-lg border border-surface transition-colors flex items-center gap-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
              </svg>
              Voice
            </motion.button>
            <button
              type="button"
              onClick={onCancel}
              className="px-2 py-1.5 text-xs text-gray-500 hover:text-foreground transition-colors"
            >
              &times;
            </button>
          </form>
          <p className="text-[10px] text-gray-600 text-center mt-1.5">Say what they lied about and what actually happened</p>
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
