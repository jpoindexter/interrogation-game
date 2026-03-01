import CloseIcon from './CloseIcon';
import { motion, AnimatePresence, fadeUp, stagger, smooth, snappy } from '../../components/motion';

interface HelpPanelProps {
  show: boolean;
  pos: { x: number; y: number } | null;
  cluesNeeded: number;
  clueIcons: string[];
  onClose: () => void;
  onPosChange: (pos: { x: number; y: number } | null) => void;
}

export default function HelpPanel({ show, pos, cluesNeeded, clueIcons, onClose, onPosChange }: HelpPanelProps) {
  return (
    <AnimatePresence>
      {show && (
        <>
        <div key="help-backdrop" className="fixed inset-0 z-39" onClick={() => { onClose(); onPosChange(null); }} />
        <motion.div
          key="help-panel"
          className={`${pos ? 'absolute' : 'fixed inset-0 m-auto'} z-40 w-[340px] max-h-[70vh] h-fit overflow-y-auto bg-surface-darker border border-surface rounded-sm shadow-2xl`}
          style={pos ? { left: pos.x, top: pos.y } : undefined}
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
              const parentRect = panel.offsetParent?.getBoundingClientRect() ?? { left: 0, top: 0 };
              const startX = e.clientX;
              const startY = e.clientY;
              const origX = rect.left - parentRect.left;
              const origY = rect.top - parentRect.top;
              const onMove = (ev: MouseEvent) => {
                onPosChange({ x: origX + (ev.clientX - startX), y: origY + (ev.clientY - startY) });
              };
              const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
              };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
          >
            <span className="text-xs uppercase tracking-[0.2em] text-gray-500">How to Play</span>
            <button onClick={() => { onClose(); onPosChange(null); }} className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-foreground transition-colors">
              <CloseIcon />
            </button>
          </div>
          <motion.div
            className="p-4 space-y-4"
            variants={stagger(0.08)}
            initial="hidden"
            animate="visible"
          >
            <motion.div className="flex gap-3" variants={fadeUp} transition={smooth}>
              <span className="text-sm font-bold text-accent shrink-0">01</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-1">Ask Questions</p>
                <p className="text-[11px] text-gray-400 leading-relaxed">Tap the mic or keyboard to question the suspect. Watch the clock &mdash; you have limited time.</p>
              </div>
            </motion.div>
            <motion.div className="flex gap-3" variants={fadeUp} transition={smooth}>
              <span className="text-sm font-bold text-accent shrink-0">02</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-1">Collect {cluesNeeded} Clues</p>
                <p className="text-[11px] text-gray-400 leading-relaxed">As you press on the right topics, the stress meter rises and you unlock detective badges.</p>
                <div className="flex items-center gap-3 mt-2">
                  {clueIcons.map((icon, i) => (
                    <img key={i} src={icon} alt="" className="w-16 h-16 object-contain" style={{ imageRendering: 'pixelated' }} />
                  ))}
                </div>
              </div>
            </motion.div>
            <motion.div className="flex gap-3" variants={fadeUp} transition={smooth}>
              <span className="text-sm font-bold text-accent shrink-0">03</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-1">Make Your Accusation</p>
                <p className="text-[11px] text-gray-400 leading-relaxed">Once you have all {cluesNeeded} clues, hit ACCUSE. State <span className="text-foreground">what</span> they lied about and <span className="text-foreground">what actually happened</span>. Be specific &mdash; &ldquo;you&apos;re lying&rdquo; won&apos;t count. You get 3 attempts.</p>
              </div>
            </motion.div>
            <motion.div className="border-t border-surface pt-3" variants={fadeUp} transition={smooth}>
              <p className="text-[10px] uppercase tracking-wider text-gold mb-2">Tips</p>
              <ul className="space-y-1.5">
                <li className="text-[11px] text-gray-400 flex gap-2"><span className="text-gold">&bull;</span>Ask open-ended questions first</li>
                <li className="text-[11px] text-gray-400 flex gap-2"><span className="text-gold">&bull;</span>Rising stress = right track</li>
                <li className="text-[11px] text-gray-400 flex gap-2"><span className="text-gold">&bull;</span>Use hints sparingly (-15% score each)</li>
                <li className="text-[11px] text-gray-400 flex gap-2"><span className="text-gold">&bull;</span>You have limited time (5-10 min by difficulty)</li>
                <li className="text-[11px] text-gray-400 flex gap-2"><span className="text-gold">&bull;</span>Faster solve = higher score</li>
              </ul>
            </motion.div>
          </motion.div>
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
