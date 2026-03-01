import type { Case } from '@/lib/game-state';
import type { ConversationMessage } from '@/lib/mistral';
import { motion, slideRight, fadeUp, scaleIn, stagger, snappy, smooth } from '../../components/motion';

interface CaseFileProps {
  caseData: Case;
  clues: string[];
  clueIcons: string[];
  cluesNeeded: number;
  hintsUsed: number;
  hintTexts?: string[];
  conversationHistory: ConversationMessage[];
}

export default function CaseFile({
  caseData,
  clues,
  clueIcons,
  cluesNeeded,
  hintsUsed,
  hintTexts = [],
  conversationHistory,
}: CaseFileProps) {
  return (
    <motion.div
      className="p-4 bg-surface-darker overflow-y-auto border-l border-surface"
      initial="hidden"
      animate="visible"
      variants={slideRight}
      transition={smooth}
    >
      <h2 className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4">
        Case File
      </h2>

      <div className="space-y-6">
        <div>
          <h3 className="text-xs uppercase tracking-wider text-accent mb-2">Crime</h3>
          <p className="text-sm text-gray-300">{caseData.crime}</p>
        </div>

        <div>
          <h3 className="text-xs uppercase tracking-wider text-accent mb-2">Suspect</h3>
          <p className="text-sm text-gray-300">{caseData.suspect_name}</p>
          <p className="text-xs text-gray-500">{caseData.suspect_role}</p>
        </div>

        <div>
          <h3 className="text-xs uppercase tracking-wider text-accent mb-2">Evidence</h3>
          <motion.div
            className="flex items-center gap-3 mb-3"
            variants={stagger(0.1)}
            initial="hidden"
            animate="visible"
          >
            {clueIcons.map((icon, i) => (
              <motion.div key={i} className="flex flex-col items-center" variants={scaleIn} transition={snappy}>
                <img
                  src={icon}
                  alt={`Evidence ${i + 1}`}
                  className={`w-20 h-20 object-contain transition-all duration-500 ${
                    clues.length >= i + 1 ? 'opacity-100' : 'opacity-20 grayscale'
                  }`}
                  style={{ imageRendering: 'pixelated' }}
                />
              </motion.div>
            ))}
          </motion.div>
          {clues.length > 0 ? (
            <motion.div className="space-y-2" variants={stagger(0.06)} initial="hidden" animate="visible">
              {clues.map((clue, i) => (
                <motion.div key={i} variants={fadeUp} transition={snappy} className="p-3 bg-surface-dark rounded border-l-2 border-accent">
                  <p className="text-sm text-gray-300">{clue}</p>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <p className="text-sm text-gray-600">Find {cluesNeeded} clues to unlock accusation.</p>
          )}
        </div>

        {hintsUsed > 0 && hintTexts.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-warn mb-2">Hints</h3>
            <div className="space-y-2">
              {hintTexts.map((trigger, i) => (
                <div key={i} className="p-3 bg-surface-dark rounded border-l-2 border-warn">
                  <p className="text-sm text-gray-300">Try asking about: {trigger}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xs uppercase tracking-wider text-gray-600 mb-2">Exchange Log</h3>
          <div className="space-y-2">
            {conversationHistory
              .filter((msg) => !(msg.role === 'user' && msg.content.startsWith('*')))
              .map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.03 }}
                  className={`text-xs ${msg.role === 'user' ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  <span className={msg.role === 'user' ? 'text-gray-500' : 'text-gold'}>
                    {msg.role === 'user' ? 'You' : caseData.suspect_name?.split(' ')[0] ?? 'Suspect'}:
                  </span>{' '}
                  {msg.content}
                </motion.div>
              ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
