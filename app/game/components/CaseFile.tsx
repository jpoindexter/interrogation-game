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
      className="overflow-y-auto border-l border-surface relative"
      initial="hidden"
      animate="visible"
      variants={slideRight}
      transition={smooth}
      style={{
        background: 'linear-gradient(180deg, #FFF9C4 0%, #FFF8B8 100%)',
        backgroundImage: `
          repeating-linear-gradient(transparent, transparent 27px, #B8D4E8 27px, #B8D4E8 28px)
        `,
      }}
    >
      {/* Red margin line */}
      <div className="absolute top-0 bottom-0 left-[32px] w-[1px] bg-red-400/50 z-10" />

      <div className="pl-10 pr-4 pt-4 pb-4">
        <h2
          className="text-sm uppercase tracking-[0.2em] text-red-800/60 mb-4 font-bold"
          style={{ fontFamily: 'var(--font-handwriting)' }}
        >
          Case File
        </h2>

        <div className="space-y-5">
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-red-800/50 mb-1">Crime</h3>
            <p className="text-sm text-gray-800 leading-relaxed">{caseData.crime}</p>
          </div>

          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-red-800/50 mb-1">Suspect</h3>
            <p className="text-sm text-gray-800 font-bold">{caseData.suspect_name}</p>
            <p className="text-xs text-gray-600">{caseData.suspect_role}</p>
          </div>

          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-red-800/50 mb-2">Evidence</h3>
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
                  <motion.div key={i} variants={fadeUp} transition={snappy} className="p-2 bg-white/30 rounded border-l-2 border-red-800/40">
                    <p className="text-sm text-gray-800">{clue}</p>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <p className="text-sm text-gray-500 italic">Find {cluesNeeded} clues to unlock accusation.</p>
            )}
          </div>

          {hintsUsed > 0 && hintTexts.length > 0 && (
            <div>
              <h3 className="text-[10px] uppercase tracking-wider text-amber-700/70 mb-2">Hints</h3>
              <div className="space-y-2">
                {hintTexts.map((trigger, i) => (
                  <div key={i} className="p-2 bg-white/30 rounded border-l-2 border-amber-600/50">
                    <p className="text-sm text-gray-800">Try asking about: {trigger}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Exchange Log</h3>
            <div className="space-y-2">
              {conversationHistory
                .filter((msg) => !(msg.role === 'user' && msg.content.startsWith('*')))
                .map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.03 }}
                    className={`text-xs ${msg.role === 'user' ? 'text-gray-700' : 'text-gray-500'}`}
                  >
                    <span className={msg.role === 'user' ? 'text-gray-800 font-bold' : 'text-amber-800'}>
                      {msg.role === 'user' ? 'You' : caseData.suspect_name?.split(' ')[0] ?? 'Suspect'}:
                    </span>{' '}
                    {msg.content}
                  </motion.div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
