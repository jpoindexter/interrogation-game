import type { PublicClue, ClueSource } from '@/lib/clue-contract';
import ClueMarker from './ClueMarker';
import { motion } from '../../components/motion';
import { SECTION_HEADER } from './CaseFilePage';

const EVIDENCE_HEADER_BG = { background: '#a0c4d4' };

export default function EvidencePage({ clues, cluesNeeded, hintsUsed, hintTexts, onOpenSource }: {
  clues: PublicClue[]; cluesNeeded: number; onOpenSource: (source: ClueSource) => void;
  hintsUsed: number; hintTexts: string[];
}) {
  return (
    <div className="p-4 text-black">
      <p className="text-base font-bold text-center uppercase tracking-widest mb-1">Investigation Leads</p>
      <p className="text-xs text-black/70 text-center mb-3">{clues.length}/{cluesNeeded} Optional Clues Collected</p>

      <p className="text-sm text-black/70 mb-3">Clues suggest what to investigate. They are not proof, and you do not need every clue to accuse.</p>
      <hr className="border-black/20 mb-3" />


      {clues.length > 0 && (
        <>
          <div className={SECTION_HEADER} style={EVIDENCE_HEADER_BG}>Clue Notes</div>
          {clues.map((clue, i) => (
            <motion.div
              key={clue.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`py-2 ${i < clues.length - 1 ? 'border-b border-black/10' : ''}`}
            >
              <div className="flex items-center gap-2 mb-1"><ClueMarker number={i + 1} /><p className="text-xs uppercase tracking-wider font-bold text-black/70">Clue #{i + 1}</p></div>
              <p className="text-sm leading-relaxed">{clue.text}</p>
              {clue.source ? <button type="button" onClick={() => onOpenSource(clue.source!)} className="mt-2 min-h-11 border border-black/60 px-3 text-sm">View source exchange</button>
                : <p className="mt-2 text-xs text-black/70">Source exchange unavailable for this saved clue.</p>}
            </motion.div>
          ))}
        </>
      )}

      {clues.length === 0 && (
        <div className="py-4 text-center">
          <p className="text-xs italic text-black/70">No optional clues collected yet.</p>
          <p className="text-xs italic text-black/70 mt-1">Compare the case record with their answers. You can accuse when you identify the contradiction.</p>
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
