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
      className="flex flex-col h-full border-l border-surface relative overflow-hidden"
      initial="hidden"
      animate="visible"
      variants={slideRight}
      transition={smooth}
      style={{
        background: '#F0EDE6',
      }}
    >
      {/* Paper texture noise */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" preserveAspectRatio="none">
        <filter id="paper-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#paper-noise)" opacity="0.1" />
      </svg>
      {/* Subtle fold/crease */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{
        background: 'linear-gradient(90deg, rgba(0,0,0,0.03) 0%, transparent 3%, transparent 97%, rgba(0,0,0,0.02) 100%)',
      }} />

      <div className="relative z-10 p-4 flex flex-col h-full min-h-0">
        <h2 className="text-sm uppercase tracking-[0.3em] text-black mb-3 font-bold text-center shrink-0">
          Case File
        </h2>

        {/* Form grid */}
        <div className="border border-black text-black flex flex-col min-h-0 flex-1">
          {/* Crime — full width */}
          <div className="border-b border-black p-2">
            <p className="text-[9px] uppercase tracking-wider font-bold mb-0.5">Nature of Crime</p>
            <p className="text-xs leading-relaxed">{caseData.crime}</p>
          </div>

          {/* Suspect row — name | role */}
          <div className="grid grid-cols-[1fr_auto] border-b border-black">
            <div className="p-2 border-r border-black">
              <p className="text-[9px] uppercase tracking-wider font-bold mb-0.5">Suspect Name</p>
              <p className="text-xs">{caseData.suspect_name}</p>
            </div>
            <div className="p-2 min-w-[90px]">
              <p className="text-[9px] uppercase tracking-wider font-bold mb-0.5">Role</p>
              <p className="text-xs">{caseData.suspect_role}</p>
            </div>
          </div>

          {/* Setting | Case # row */}
          <div className="grid grid-cols-[1fr_auto] border-b border-black">
            <div className="p-2 border-r border-black">
              <p className="text-[9px] uppercase tracking-wider font-bold mb-0.5">Location</p>
              <p className="text-xs">{caseData.setting}</p>
            </div>
            <div className="p-2 min-w-[90px]">
              <p className="text-[9px] uppercase tracking-wider font-bold mb-0.5">Case No.</p>
              <p className="text-xs">{caseData.case_number}</p>
            </div>
          </div>

          {/* Evidence section header */}
          <div className="border-b border-black p-1.5 bg-black/5">
            <p className="text-[10px] uppercase tracking-wider font-bold text-center">Evidence</p>
          </div>

          {/* Evidence + hints — scrollable when many clues */}
          <div className="border-b border-black overflow-y-auto max-h-[40%] shrink-0 paper-scroll">
            {/* Evidence icons */}
            <div className="border-b border-black/30 p-3">
              <div className="flex items-center gap-3 justify-center flex-wrap">
                {clueIcons.map((icon, i) => (
                  <div key={i} className={`w-20 h-20 border border-black/40 flex items-center justify-center transition-all duration-700 ${
                    clues.length >= i + 1 ? 'bg-white' : 'grayscale opacity-30'
                  }`}>
                    <img
                      src={icon}
                      alt={`Evidence ${i + 1}`}
                      className="w-14 h-14 object-contain"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Clue entries */}
            {clues.map((clue, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`p-2 ${i < clues.length - 1 ? 'border-b border-black/30' : ''}`}
              >
                <p className="text-[9px] uppercase tracking-wider font-bold mb-0.5">Evidence #{i + 1}</p>
                <p className="text-xs">{clue}</p>
              </motion.div>
            ))}
            {clues.length === 0 && (
              <div className="p-2">
                <p className="text-xs italic">Collect {cluesNeeded} pieces of evidence to file accusation.</p>
              </div>
            )}

            {/* Hints */}
            {hintsUsed > 0 && hintTexts.length > 0 && (
              <>
                <div className="border-t border-black/30 p-1.5 bg-black/5">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-center">Hints</p>
                </div>
                {hintTexts.map((trigger, i) => (
                  <div key={i} className={`p-2 ${i < hintTexts.length - 1 ? 'border-b border-black/30' : ''}`}>
                    <p className="text-xs">Try asking about: {trigger}</p>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Exchange log header */}
          <div className="border-b border-black p-1.5 bg-black/5 shrink-0">
            <p className="text-[10px] uppercase tracking-wider font-bold text-center">Exchange Log</p>
          </div>

          {/* Exchange log entries — fills remaining space, scrolls */}
          <div className="p-2 space-y-1.5 flex-1 overflow-y-auto min-h-0 bg-black/[0.03] paper-scroll">
            {(() => {
              const filtered = conversationHistory.filter((msg) => !(msg.role === 'user' && msg.content.startsWith('*')));
              return filtered.map((msg, i) => {
                const isLast = i === filtered.length - 1;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.03 }}
                    className={`text-xs ${isLast ? 'text-black' : 'text-black/40'}`}
                  >
                    <span className="font-bold">
                      {msg.role === 'user' ? 'You' : caseData.suspect_name?.split(' ')[0] ?? 'Suspect'}:
                    </span>{' '}
                    {msg.content}
                  </motion.div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
