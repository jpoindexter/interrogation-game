import { recordReleaseProgress } from '@/lib/case-disclosure-policy';
import type { ConversationMessage } from '@/lib/ai/types';
import type { PublicClue, ClueSource } from '@/lib/clue-contract';
import EvidenceNote from './EvidenceNote';
import { SECTION_HEADER } from './CaseFilePage';

const EVIDENCE_HEADER_BG = { background: '#a0c4d4' };

export default function EvidencePage({ clues, hintsUsed, hintTexts, onOpenSource, difficulty = 'medium', history = [] }: {
  history?: ConversationMessage[]; difficulty?: string;
  clues: PublicClue[]; cluesNeeded: number; onOpenSource: (source: ClueSource) => void;
  hintsUsed: number; hintTexts: string[];
}) {
  const progress = recordReleaseProgress(history, difficulty);
  const recordReleased = clues.some(clue => clue.origin === 'case-record');
  return (
    <div className="p-4 text-black">
      <p className="text-base font-bold text-center uppercase tracking-widest mb-1">Investigation Leads</p>
      <p className="text-xs text-black/70 text-center mb-3">{clues.length} {clues.length === 1 ? 'Case Note' : 'Case Notes'} Collected</p>

      <p className="text-sm text-black/70 mb-3">Case evidence notes summarize the case file. Earlier saved clues may be investigation suggestions. Compare each with the suspect’s claims; you can accuse at any time.</p>
      <div role="status" className="mb-3 border border-black/30 p-2 text-xs">
        {recordReleased ? 'Case evidence note available. Compare it with the suspect’s account.'
          : `Case evidence check: ${Math.min(progress.asked, progress.required)}/${progress.required} questions. Ask distinct questions with at least 15 letters; opening actions and accusations do not count. The note arrives with the final qualifying answer. Stress does not affect release.`}
      </div>
      <hr className="border-black/20 mb-3" />


      {clues.length > 0 && (
        <>
          <div className={SECTION_HEADER} style={EVIDENCE_HEADER_BG}>Clue Notes</div>
          {clues.map((clue, i) => (
            <EvidenceNote key={clue.id} clue={clue} number={i + 1} last={i === clues.length - 1} onOpenSource={onOpenSource} />
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
              <p className="text-[0.6875rem] uppercase tracking-wider font-bold text-black/50 underline mb-0.5">Hint #{i + 1}</p>
              <p className="text-sm">Try asking about: {trigger}</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
