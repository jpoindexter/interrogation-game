import type { GameController } from '../controller/useGameController';
import { motion, AnimatePresence } from '../../components/motion';

export function GameFeedback(model: GameController) {
  const { fadingOut, toast } = model;
  return <>
    {model.endGameError && <div className="fixed inset-x-4 bottom-24 z-50 border border-accent bg-black p-4" role="alert">
      <p>{model.endGameError}</p><button onClick={model.retryEnd}>Retry ending</button>
    </div>}
      <AnimatePresence>
        {toast && (<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.25 }} className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-accent/90 text-foreground font-mono text-xs px-4 py-2 rounded border border-accent">{toast}</motion.div>)}
      </AnimatePresence>
      <AnimatePresence>
        {fadingOut && <motion.div className="fixed inset-0 bg-black z-[100] pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, ease: 'easeIn' }} />}
      </AnimatePresence>

  </>;
}
