import { motion, AnimatePresence } from 'framer-motion';
import { formatTime } from '../components/utils';

interface Breakdown {
  timeScore: number;
  diffMultiplier: number;
  diff: { label: string };
  hintsUsed: number;
  hintMultiplier: number;
  wrongAccusations: number;
  accusationMultiplier: number;
  finalScore: number;
}

interface ScoreBreakdownProps {
  breakdown: Breakdown;
  timeElapsed: number;
  revealStep: number;
  displayScore: number;
  totalRef: React.RefObject<HTMLDivElement | null>;
}

function getRating(score: number): string {
  if (score >= 2000) return 'Legendary';
  if (score >= 1200) return 'Veteran';
  if (score >= 800) return 'Sharp';
  if (score >= 400) return 'Rookie';
  return 'Trainee';
}

const spring = { type: 'spring' as const, stiffness: 400, damping: 15 };

function ScoreLine({ label, sublabel, value, color, step, revealStep }: {
  label: string; sublabel: string; value: string; color?: string; step: number; revealStep: number;
}) {
  return (
    <motion.div
      className="flex justify-between items-center"
      initial={{ opacity: 0, x: -10 }}
      animate={revealStep >= step ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div>
        <span className="text-sm text-gray-300">{label}</span>
        <span className="text-xs text-gray-500 ml-2">{sublabel}</span>
      </div>
      <motion.span
        className={`text-sm font-bold tabular-nums ${color || ''}`}
        initial={{ scale: 0.5 }}
        animate={revealStep >= step ? { scale: 1 } : {}}
        transition={spring}
      >
        {value}
      </motion.span>
    </motion.div>
  );
}

export default function ScoreBreakdown({ breakdown, timeElapsed, revealStep, displayScore, totalRef }: ScoreBreakdownProps) {
  return (
    <motion.div
      className="bg-surface-dark/80 backdrop-blur-sm rounded-sm p-6 sm:p-8 mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      <h2 className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-5">Score Breakdown</h2>
      <div className="space-y-3">
        <ScoreLine label="Time" sublabel={formatTime(timeElapsed)} value={String(breakdown.timeScore)} step={1} revealStep={revealStep} />
        <ScoreLine label="Difficulty" sublabel={breakdown.diff.label} value={`\u00d7${breakdown.diffMultiplier.toFixed(1)}`} color="text-gold" step={2} revealStep={revealStep} />
        <ScoreLine
          label="Hints used" sublabel={String(breakdown.hintsUsed)}
          value={breakdown.hintsUsed > 0 ? `\u2212${Math.round((1 - breakdown.hintMultiplier) * 100)}%` : 'No penalty'}
          color={breakdown.hintsUsed > 0 ? 'text-accent' : 'text-green-500'} step={3} revealStep={revealStep}
        />
        <ScoreLine
          label="Wrong accusations" sublabel={String(breakdown.wrongAccusations)}
          value={breakdown.wrongAccusations > 0 ? `\u2212${Math.round((1 - breakdown.accusationMultiplier) * 100)}%` : 'No penalty'}
          color={breakdown.wrongAccusations > 0 ? 'text-accent' : 'text-green-500'} step={4} revealStep={revealStep}
        />

        <AnimatePresence>
          {revealStep >= 5 && (
            <motion.div ref={totalRef} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="border-t border-surface my-3" />
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">Total</span>
                <motion.span
                  className="text-3xl font-bold text-gold tabular-nums"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 12 }}
                >
                  {displayScore.toLocaleString()}
                </motion.span>
              </div>
              <motion.p
                className="text-right text-sm text-gray-400 mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                {getRating(breakdown.finalScore)}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
