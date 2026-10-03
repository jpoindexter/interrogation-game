import type { PublicClue } from '@/lib/clue-contract';
import ClueSource from './ClueSource';
import { useCaseFileNavigation } from './useCaseFileNavigation';
import type { Case } from '@/lib/game-state';
import type { ConversationMessage } from '@/lib/game-ai';
import { motion, slideRight, smooth } from '../../components/motion';
import CasePage from './CaseFilePage';
import EvidencePage from './EvidencePage';
import LogPage from './LogPage';
import CaseTabs from './CaseTabs';
import CaseUpdates from './CaseUpdates';

interface CaseFileProps {
  caseData: Case;
  clues: PublicClue[];
  questionDraft: string;
  onReference: (reference: string) => void;
  cluesNeeded: number;
  hintsUsed: number;
  hintTexts?: string[];
  conversationHistory: ConversationMessage[];
}

export default function CaseFile({
  caseData, clues, questionDraft, onReference, cluesNeeded, hintsUsed, hintTexts = [], conversationHistory,
}: CaseFileProps) {
  const { page, source, logEndRef, scrollRef, changePage, openSource, onScroll, unread, showLatest, showLeads } = useCaseFileNavigation(clues, hintTexts.length, conversationHistory);

  const filtered = conversationHistory.filter(m => m.content && !m.content.startsWith('*'));


  return (
    <motion.div
      className="relative h-full min-h-0"
      initial="hidden" animate="visible" variants={slideRight} transition={smooth}
    >
      <CaseTabs page={page} setPage={changePage} clueCount={clues.length} messageCount={filtered.length} unread={unread} />

      <div data-surface="paper" className="flex flex-col h-full border-l border-surface-darker relative overflow-hidden"
        style={{ background: '#F0EDE6' }}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" preserveAspectRatio="none">
          <filter id="paper-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#paper-noise)" opacity="0.1" />
        </svg>
        <div className="absolute inset-0 pointer-events-none z-0" style={{
          background: 'linear-gradient(90deg, rgba(0,0,0,0.03) 0%, transparent 3%, transparent 97%, rgba(0,0,0,0.02) 100%)',
        }} />

        <div ref={scrollRef} tabIndex={-1} aria-label="Case file contents" onScroll={onScroll} className="relative z-10 flex-1 min-h-0 overflow-y-auto paper-scroll">
          {page === 'case' && <CasePage caseData={caseData} />}
          {page === 'evidence' && (
            <EvidencePage clues={clues} onOpenSource={openSource} cluesNeeded={cluesNeeded} hintsUsed={hintsUsed} hintTexts={hintTexts} difficulty={String(caseData.difficulty)} history={conversationHistory} />
          )}
          {page === 'log' && (
            <>
              {source && <ClueSource source={source} draft={questionDraft} onReference={onReference}
                onBack={showLeads} />}
              <LogPage conversationHistory={filtered} suspectName={caseData.suspect_name} logEndRef={logEndRef} />
            </>
          )}
        </div>
        <CaseUpdates unread={unread} onLatest={showLatest} onLeads={showLeads} />
      </div>
    </motion.div>
  );
}
