import { useState, useEffect, useRef } from 'react';
import type { Case } from '@/lib/game-state';
import type { ConversationMessage } from '@/lib/mistral';
import { motion, slideRight, smooth } from '../../components/motion';
import CasePage from './CaseFilePage';
import EvidencePage from './EvidencePage';
import LogPage from './LogPage';

interface CaseFileProps {
  caseData: Case;
  clues: string[];
  clueIcons: string[];
  cluesNeeded: number;
  hintsUsed: number;
  hintTexts?: string[];
  conversationHistory: ConversationMessage[];
}

type Page = 'case' | 'evidence' | 'log';

export default function CaseFile({
  caseData, clues, clueIcons, cluesNeeded, hintsUsed, hintTexts = [], conversationHistory,
}: CaseFileProps) {
  const [page, setPage] = useState<Page>('case');
  const logEndRef = useRef<HTMLDivElement | null>(null);
  const prevHintCount = useRef(hintTexts.length);
  const prevClueCount = useRef(clues.length);

  useEffect(() => {
    if (page === 'log') logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory, page]);

  // Auto-flip to evidence tab when a new hint or clue arrives
  useEffect(() => {
    if (hintTexts.length > prevHintCount.current) setPage('evidence');
    prevHintCount.current = hintTexts.length;
  }, [hintTexts.length]);

  useEffect(() => {
    if (clues.length > prevClueCount.current) setPage('evidence');
    prevClueCount.current = clues.length;
  }, [clues.length]);

  const filtered = conversationHistory.filter(m => !m.content.startsWith('*'));
  const tabs: { key: Page; label: string; badge?: number; color: string; activeColor: string }[] = [
    { key: 'case', label: 'Case', color: 'bg-[#b8a88a]', activeColor: 'bg-[#d4c4a0]' },
    { key: 'evidence', label: 'Evidence', badge: clues.length > 0 ? clues.length : undefined, color: 'bg-[#8aabb8]', activeColor: 'bg-[#a0c4d4]' },
    { key: 'log', label: 'Log', badge: filtered.length > 0 ? filtered.length : undefined, color: 'bg-[#b88a8a]', activeColor: 'bg-[#d4a0a0]' },
  ];

  return (
    <motion.div
      className="h-full relative"
      initial="hidden" animate="visible" variants={slideRight} transition={smooth}
    >
      {/* Folder tabs — float over game board */}
      <div className="absolute top-3 right-full flex flex-col z-20">
        {tabs.map(({ key, label, badge, color, activeColor }) => (
          <button
            key={key}
            onClick={() => setPage(key)}
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

      {/* Paper panel */}
      <div className="flex flex-col h-full border-l border-surface-darker relative overflow-hidden"
        style={{ background: '#F0EDE6' }}
      >
        {/* Paper texture */}
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

        {/* Page content */}
        <div className="relative z-10 flex-1 min-h-0 overflow-y-auto paper-scroll">
          {page === 'case' && <CasePage caseData={caseData} />}
          {page === 'evidence' && (
            <EvidencePage clues={clues} clueIcons={clueIcons} cluesNeeded={cluesNeeded} hintsUsed={hintsUsed} hintTexts={hintTexts} />
          )}
          {page === 'log' && (
            <LogPage conversationHistory={filtered} suspectName={caseData.suspect_name} logEndRef={logEndRef} />
          )}
        </div>

        {/* Torn bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none" style={{ height: 28 }}>
          {/* Shadow layer — offset down + blurred for depth */}
          <div className="absolute inset-0" style={{
            background: 'rgba(0,0,0,0.12)',
            clipPath: 'polygon(0% 32%, 1% 38%, 1.5% 42%, 2% 36%, 3% 48%, 4% 40%, 4.5% 52%, 5% 44%, 6% 56%, 7% 46%, 7.5% 38%, 8% 50%, 9% 58%, 10% 42%, 11% 54%, 12% 46%, 13% 60%, 14% 48%, 14.5% 42%, 15% 52%, 16% 44%, 17% 56%, 18% 38%, 19% 50%, 20% 62%, 21% 46%, 22% 54%, 23% 40%, 24% 52%, 25% 64%, 26% 48%, 27% 56%, 28% 42%, 29% 50%, 30% 58%, 31% 44%, 32% 56%, 33% 38%, 34% 50%, 35% 62%, 36% 44%, 37% 52%, 38% 40%, 39% 54%, 40% 60%, 41% 46%, 42% 38%, 43% 52%, 44% 58%, 45% 42%, 46% 50%, 47% 62%, 48% 44%, 49% 56%, 50% 40%, 51% 52%, 52% 60%, 53% 46%, 54% 54%, 55% 38%, 56% 50%, 57% 58%, 58% 42%, 59% 54%, 60% 62%, 61% 46%, 62% 38%, 63% 52%, 64% 56%, 65% 40%, 66% 50%, 67% 60%, 68% 44%, 69% 52%, 70% 36%, 71% 50%, 72% 58%, 73% 42%, 74% 54%, 75% 62%, 76% 46%, 77% 38%, 78% 52%, 79% 56%, 80% 40%, 81% 50%, 82% 60%, 83% 44%, 84% 36%, 85% 52%, 86% 58%, 87% 42%, 88% 54%, 89% 46%, 90% 60%, 91% 48%, 92% 38%, 93% 52%, 94% 56%, 95% 42%, 96% 50%, 97% 58%, 98% 44%, 99% 52%, 100% 38%, 100% 0%, 0% 0%)',
            transform: 'translateY(3px)',
            filter: 'blur(2px)',
          }} />
          {/* Paper layer — crisp torn edge */}
          <div className="w-full h-full" style={{
            background: '#F0EDE6',
            clipPath: 'polygon(0% 30%, 1% 36%, 1.5% 40%, 2% 34%, 3% 46%, 4% 38%, 4.5% 50%, 5% 42%, 6% 54%, 7% 44%, 7.5% 36%, 8% 48%, 9% 56%, 10% 40%, 11% 52%, 12% 44%, 13% 58%, 14% 46%, 14.5% 40%, 15% 50%, 16% 42%, 17% 54%, 18% 36%, 19% 48%, 20% 60%, 21% 44%, 22% 52%, 23% 38%, 24% 50%, 25% 62%, 26% 46%, 27% 54%, 28% 40%, 29% 48%, 30% 56%, 31% 42%, 32% 54%, 33% 36%, 34% 48%, 35% 60%, 36% 42%, 37% 50%, 38% 38%, 39% 52%, 40% 58%, 41% 44%, 42% 36%, 43% 50%, 44% 56%, 45% 40%, 46% 48%, 47% 60%, 48% 42%, 49% 54%, 50% 38%, 51% 50%, 52% 58%, 53% 44%, 54% 52%, 55% 36%, 56% 48%, 57% 56%, 58% 40%, 59% 52%, 60% 60%, 61% 44%, 62% 36%, 63% 50%, 64% 54%, 65% 38%, 66% 48%, 67% 58%, 68% 42%, 69% 50%, 70% 34%, 71% 48%, 72% 56%, 73% 40%, 74% 52%, 75% 60%, 76% 44%, 77% 36%, 78% 50%, 79% 54%, 80% 38%, 81% 48%, 82% 58%, 83% 42%, 84% 34%, 85% 50%, 86% 56%, 87% 40%, 88% 52%, 89% 44%, 90% 58%, 91% 46%, 92% 36%, 93% 50%, 94% 54%, 95% 40%, 96% 48%, 97% 56%, 98% 42%, 99% 50%, 100% 36%, 100% 0%, 0% 0%)',
          }} />
          {/* Fiber highlight — thin white line along tear */}
          <div className="absolute inset-0" style={{
            background: 'rgba(255,255,255,0.5)',
            clipPath: 'polygon(0% 30%, 1% 36%, 1.5% 40%, 2% 34%, 3% 46%, 4% 38%, 4.5% 50%, 5% 42%, 6% 54%, 7% 44%, 7.5% 36%, 8% 48%, 9% 56%, 10% 40%, 11% 52%, 12% 44%, 13% 58%, 14% 46%, 14.5% 40%, 15% 50%, 16% 42%, 17% 54%, 18% 36%, 19% 48%, 20% 60%, 21% 44%, 22% 52%, 23% 38%, 24% 50%, 25% 62%, 26% 46%, 27% 54%, 28% 40%, 29% 48%, 30% 56%, 31% 42%, 32% 54%, 33% 36%, 34% 48%, 35% 60%, 36% 42%, 37% 50%, 38% 38%, 39% 52%, 40% 58%, 41% 44%, 42% 36%, 43% 50%, 44% 56%, 45% 40%, 46% 48%, 47% 60%, 48% 42%, 49% 54%, 50% 38%, 51% 50%, 52% 58%, 53% 44%, 54% 52%, 55% 36%, 56% 48%, 57% 56%, 58% 40%, 59% 52%, 60% 60%, 61% 44%, 62% 36%, 63% 50%, 64% 54%, 65% 38%, 66% 48%, 67% 58%, 68% 42%, 69% 50%, 70% 34%, 71% 48%, 72% 56%, 73% 40%, 74% 52%, 75% 60%, 76% 44%, 77% 36%, 78% 50%, 79% 54%, 80% 38%, 81% 48%, 82% 58%, 83% 42%, 84% 34%, 85% 50%, 86% 56%, 87% 40%, 88% 52%, 89% 44%, 90% 58%, 91% 46%, 92% 36%, 93% 50%, 94% 54%, 95% 40%, 96% 48%, 97% 56%, 98% 42%, 99% 50%, 100% 36%, 100% 28%, 0% 28%)',
            transform: 'translateY(1px)',
          }} />
        </div>
      </div>
    </motion.div>
  );
}
