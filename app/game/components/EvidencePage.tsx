import { motion } from '../../components/motion';
import { SECTION_HEADER } from './CaseFilePage';

const EVIDENCE_HEADER_BG = { background: '#a0c4d4' };

export default function EvidencePage({ clues, clueIcons, cluesNeeded, hintsUsed, hintTexts }: {
  clues: string[]; clueIcons: string[]; cluesNeeded: number;
  hintsUsed: number; hintTexts: string[];
}) {
  return (
    <div className="p-4 text-black">
      <p className="text-base font-bold text-center uppercase tracking-widest mb-1">Evidence Report</p>
      <p className="text-xs text-black/40 text-center mb-3">{clues.length}/{cluesNeeded} Items Collected</p>

      <hr className="border-black/20 mb-3" />

      <div className={SECTION_HEADER} style={EVIDENCE_HEADER_BG}>Physical Evidence</div>
      <div className="py-3 flex items-center gap-3 justify-center flex-wrap">
        {clueIcons.map((icon, i) => (
          <div key={i} className={`w-20 h-20 border border-black/40 flex items-center justify-center transition-all duration-700 ${
            clues.length >= i + 1 ? 'bg-white' : 'grayscale opacity-30'
          }`}>
            <img src={icon} alt={`Evidence ${i + 1}`} className="w-14 h-14 object-contain" style={{ imageRendering: 'pixelated' }} />
          </div>
        ))}
      </div>

      {clues.length > 0 && (
        <>
          <div className={SECTION_HEADER} style={EVIDENCE_HEADER_BG}>Evidence Details</div>
          {clues.map((clue, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`py-2 ${i < clues.length - 1 ? 'border-b border-black/10' : ''}`}
            >
              <p className="text-[11px] uppercase tracking-wider font-bold text-black/50 underline mb-0.5">Item #{i + 1}</p>
              <p className="text-sm leading-relaxed">{clue}</p>
            </motion.div>
          ))}
        </>
      )}

      {clues.length === 0 && (
        <div className="py-4 text-center">
          <p className="text-xs italic text-black/40">No evidence collected yet.</p>
          <p className="text-xs italic text-black/30 mt-1">Raise the suspect&apos;s stress to uncover evidence.</p>
        </div>
      )}

      {hintsUsed > 0 && hintTexts.length > 0 && (
        <>
          <div className={`${SECTION_HEADER} mt-3`} style={EVIDENCE_HEADER_BG}>Investigator Notes</div>
          {hintTexts.map((trigger, i) => (
            <div key={i} className={`py-2 ${i < hintTexts.length - 1 ? 'border-b border-black/10' : ''}`}>
              <p className="text-[11px] uppercase tracking-wider font-bold text-black/50 underline mb-0.5">Hint #{i + 1}</p>
              <p className="text-sm">Try asking about: {trigger}</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
