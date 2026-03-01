'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, scaleIn, springy } from '../../components/motion';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const btnCls = (variant: 'gold' | 'surface') =>
  `px-8 py-4 font-bold text-sm uppercase tracking-[0.2em] rounded-sm transition-colors ${variant === 'gold' ? 'bg-gold text-black hover:bg-gold-hover' : 'bg-surface text-foreground hover:bg-surface-hover'}`;

interface InitialsEntryProps {
  score: number;
  onSubmit: (initials: string) => void;
  onViewScore: () => void;
  onViewLeaderboard: () => void;
}

export default function InitialsEntry({ score, onSubmit, onViewScore, onViewLeaderboard }: InitialsEntryProps) {
  const [initials, setInitials] = useState(['A', 'A', 'A']);
  const [activeSlot, setActiveSlot] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => { containerRef.current?.focus(); }, []);

  const cycle = useCallback((slot: number, dir: number) => {
    setInitials(prev => { const n = [...prev]; n[slot] = CHARS[(CHARS.indexOf(n[slot]) + dir + 26) % 26]; return n; });
  }, []);

  const handleSubmit = useCallback(() => { if (submitted) return; setSubmitted(true); onSubmit(initials.join('')); }, [submitted, initials, onSubmit]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    e.preventDefault();
    if (submitted) return;
    if (e.key === 'ArrowUp') cycle(activeSlot, 1);
    else if (e.key === 'ArrowDown') cycle(activeSlot, -1);
    else if (e.key === 'ArrowLeft') setActiveSlot(s => Math.max(0, s - 1));
    else if (e.key === 'ArrowRight') setActiveSlot(s => Math.min(2, s + 1));
    else if (e.key === 'Enter') handleSubmit();
    else if (/^[a-zA-Z]$/.test(e.key)) {
      setInitials(prev => { const n = [...prev]; n[activeSlot] = e.key.toUpperCase(); return n; });
      setActiveSlot(s => Math.min(2, s + 1));
    }
  }, [activeSlot, cycle, handleSubmit, submitted]);

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <motion.div ref={containerRef} tabIndex={0} onKeyDown={handleKey} className="text-center outline-none px-6"
        initial={{ opacity: 0, scale: 0.8, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -20 }} transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}>

        <motion.p className="text-gold text-sm uppercase tracking-[0.4em] mb-2"
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}>High Score</motion.p>
        <motion.p className="text-5xl sm:text-7xl font-bold text-gold tabular-nums mb-6"
          initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 250, damping: 15, delay: 0.4 }}>{score.toLocaleString()}</motion.p>

        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div key="entry" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <motion.p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-8"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>Enter Your Initials</motion.p>
              <div className="flex justify-center gap-4 sm:gap-6 mb-8">
                {initials.map((char, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <button onClick={() => { setActiveSlot(i); cycle(i, 1); }}
                      className="text-gray-600 hover:text-gold transition-colors text-xs leading-none">&#9650;</button>
                    <motion.button onClick={() => setActiveSlot(i)}
                      className={`relative w-14 h-16 sm:w-18 sm:h-20 flex items-center justify-center text-4xl sm:text-5xl font-bold tabular-nums rounded-sm transition-colors ${
                        i === activeSlot ? 'text-gold bg-gold/10 border border-gold/30' : 'text-gray-500 bg-surface/50 border border-surface'}`}
                      key={char} variants={scaleIn} initial="hidden" animate="visible" transition={springy}>
                      {char}
                      {i === activeSlot && <motion.span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gold"
                        animate={{ opacity: [1, 0] }} transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }} />}
                    </motion.button>
                    <button onClick={() => { setActiveSlot(i); cycle(i, -1); }}
                      className="text-gray-600 hover:text-gold transition-colors text-xs leading-none">&#9660;</button>
                  </div>
                ))}
              </div>
              <motion.button onClick={handleSubmit} className={`px-10 py-4 ${btnCls('gold')}`}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>Submit</motion.button>
            </motion.div>
          ) : (
            <motion.div key="posted" className="space-y-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
              <p className="text-sm text-gray-400 uppercase tracking-[0.2em] mb-6">{initials.join('')} — Recorded</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <motion.button onClick={onViewLeaderboard} className={btnCls('gold')} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>View Leaderboard</motion.button>
                <motion.button onClick={onViewScore} className={btnCls('surface')} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>Back to Score</motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
