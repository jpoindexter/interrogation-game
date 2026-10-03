import AssetImage from '../../components/AssetImage';
import FloatingPanel from './panels/FloatingPanel';
import { motion, fadeUp, stagger, smooth } from '../../components/motion';

interface HelpPanelProps {
  show: boolean;
  pos: { x: number; y: number } | null;
  cluesNeeded: number;
  clueIcons: string[];
  isUnlimited?: boolean;
  playMode?: 'challenge' | 'relaxed' | 'endurance';
  difficulty?: string;
  onClose: () => void;
  onPosChange: (pos: { x: number; y: number } | null) => void;
}

export default function HelpPanel({ show, pos, cluesNeeded, clueIcons, isUnlimited, playMode, difficulty, onClose, onPosChange }: HelpPanelProps) {
  if (!show) return null;
  return <FloatingPanel title="How to play" pos={pos} onPosition={onPosChange} onClose={onClose}>
    <HelpInstructions playMode={playMode} isUnlimited={isUnlimited} difficulty={difficulty} cluesNeeded={cluesNeeded} clueIcons={clueIcons} />
  </FloatingPanel>;
}

function HelpInstructions({ isUnlimited, playMode, difficulty, cluesNeeded, clueIcons }: { playMode?: 'challenge' | 'relaxed' | 'endurance'; isUnlimited: boolean | undefined; difficulty: string | undefined; cluesNeeded: number; clueIcons: string[] }) {
  return (
<motion.div
            className="p-4 space-y-4 overflow-y-auto min-h-0"
            variants={stagger(0.08)}
            initial="hidden"
            animate="visible"
          >
            <motion.div className="flex gap-3" variants={fadeUp} transition={smooth}>
              <span className="text-sm font-bold text-accent shrink-0">01</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-1">Ask Questions</p>
                <p className="text-sm text-gray-400 leading-relaxed">Tap the mic or keyboard to question the suspect. {isUnlimited ? 'The countdown is off.' : 'Watch the clock \u2014 you have limited time.'}{playMode === 'endurance' && (difficulty === 'hard' || difficulty === 'expert') ? <span className="text-accent"> Four successive turns at stress 8 or higher end the interview.</span> : ''}</p>
              </div>
            </motion.div>
            <motion.div className="flex gap-3" variants={fadeUp} transition={smooth}>
              <span className="text-sm font-bold text-accent shrink-0">02</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-1">Collect {cluesNeeded} Clues</p>
                <p className="text-sm text-gray-400 leading-relaxed">Compare statements and disclosed evidence. Authored practice awards clues for established contradictions. Stress is a fictional game response, not proof of a lie.</p>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  {clueIcons.map((icon, i) => (
                    <AssetImage key={i} src={icon} alt="" className="w-16 h-16 object-contain" style={{ imageRendering: 'pixelated' }} />
                  ))}
                </div>
              </div>
            </motion.div>
            <motion.div className="flex gap-3" variants={fadeUp} transition={smooth}>
              <span className="text-sm font-bold text-accent shrink-0">03</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-1">Make Your Accusation</p>
                <p className="text-sm text-gray-400 leading-relaxed">Once you have all {cluesNeeded} clues, hit ACCUSE. State <span className="text-foreground">what</span> they lied about and <span className="text-foreground">what actually happened</span>. Be specific &mdash; &ldquo;you&apos;re lying&rdquo; won&apos;t count. You get 3 attempts.</p>
              </div>
            </motion.div>
            <motion.div className="border-t border-surface pt-3" variants={fadeUp} transition={smooth}>
              <p className="text-xs uppercase tracking-wider text-gold mb-2">Tactics</p>
              <ul className="space-y-1.5">
                <li className="text-sm text-gray-400 flex gap-2"><span className="text-gold">&bull;</span>Compare dates and times with the case record</li>
                <li className="text-sm text-gray-400 flex gap-2"><span className="text-gold">&bull;</span>Revisit an earlier answer and ask for detail</li>
                <li className="text-sm text-gray-400 flex gap-2"><span className="text-gold">&bull;</span>Give the suspect room to explain their account</li>
                <li className="text-sm text-gray-400 flex gap-2"><span className="text-gold">&bull;</span>Present an exhibit and ask about a specific discrepancy</li>
                <li className="text-sm text-gray-400 flex gap-2"><span className="text-gold">&bull;</span>Test an explanation against evidence, not demeanor</li>
              </ul>
            </motion.div>
          </motion.div>
  );
}
