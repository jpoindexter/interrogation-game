import type { PublicClue } from '@/lib/clue-contract';
import ClueSource from './ClueSource';
import { useCaseFileNavigation, type CaseFilePage as Page } from './useCaseFileNavigation';
import type { Case } from '@/lib/game-state';
import type { ConversationMessage } from '@/lib/game-ai';
import { motion, slideRight, smooth } from '../../components/motion';
import CasePage from './CaseFilePage';
import EvidencePage from './EvidencePage';
import LogPage from './LogPage';
import { playSfx } from '../../lib/sfx-utils';

const playPaper = () => playSfx('/efx/paper.mp3', 0.3);

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
  const { page, source, logEndRef, changePage, openSource, onScroll } = useCaseFileNavigation(clues, hintTexts.length, conversationHistory);

  const filtered = conversationHistory.filter(m => m.content && !m.content.startsWith('*'));


  return (
    <motion.div
      className="relative h-full min-h-0"
      initial="hidden" animate="visible" variants={slideRight} transition={smooth}
    >
      <CaseTabs page={page} setPage={changePage} clueCount={clues.length} messageCount={filtered.length} />

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

        <div onScroll={onScroll} className="relative z-10 flex-1 min-h-0 overflow-y-auto paper-scroll">
          {page === 'case' && <CasePage caseData={caseData} />}
          {page === 'evidence' && (
            <EvidencePage clues={clues} onOpenSource={openSource} cluesNeeded={cluesNeeded} hintsUsed={hintsUsed} hintTexts={hintTexts} />
          )}
          {page === 'log' && (
            <>
              {source && <ClueSource source={source} draft={questionDraft} onReference={onReference}
                onBack={() => changePage('evidence')} />}
              <LogPage conversationHistory={filtered} suspectName={caseData.suspect_name} logEndRef={logEndRef} />
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function CaseTabs({ page, setPage, clueCount, messageCount }: { page: Page; setPage: (page: Page) => void; clueCount: number; messageCount: number }) {
  const tabs: { key: Page; label: string; badge?: number; color: string; activeColor: string }[] = [
    { key: 'case', label: 'Case', color: 'bg-[#b8a88a]', activeColor: 'bg-[#d4c4a0]' },
    { key: 'evidence', label: 'Leads', badge: clueCount > 0 ? clueCount : undefined, color: 'bg-[#8aabb8]', activeColor: 'bg-[#a0c4d4]' },
    { key: 'log', label: 'Log', badge: messageCount > 0 ? messageCount : undefined, color: 'bg-[#b88a8a]', activeColor: 'bg-[#d4a0a0]' },
  ];
  return (
      <div className="absolute top-3 right-full flex flex-col z-20">
        {tabs.map(({ key, label, badge, color, activeColor }) => (
          <button
            key={key}
            aria-pressed={page === key}
            onClick={() => { if (page !== key) playPaper(); setPage(key); }}
            className={`px-2 py-5 text-[11px] font-bold transition-colors rounded-l-sm mb-0.5 ${
              page === key ? `${activeColor} text-black/80` : `${color} text-black/30 opacity-70 hover:opacity-90`
            }`}
            style={{
              writingMode: 'vertical-lr',
              textOrientation: 'mixed',
              fontFamily: 'var(--font-handwriting)',
            }}
          >
            {label}
            {badge !== undefined && (
              <span className="mt-1 text-[9px] bg-black/10 px-0.5 rounded-sm tabular-nums"
                style={{ fontFamily: 'var(--font-mono)' }}
              >{badge}</span>
            )}
          </button>
        ))}
      </div>
  );
}
