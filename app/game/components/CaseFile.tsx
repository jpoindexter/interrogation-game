import { useState, useEffect, useRef } from 'react';
import type { Case } from '@/lib/game-state';
import type { ConversationMessage } from '@/lib/mistral';
import { motion, slideRight, smooth } from '../../components/motion';

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

  useEffect(() => {
    if (page === 'case') logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory, page]);

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
            className={`px-2 py-5 text-[11px] font-bold transition-colors rounded-l-sm mb-0.5 text-black/80 hover:text-black ${
              page === key ? activeColor : `${color} hover:brightness-105`
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
      <div className="flex flex-col h-full border-l border-surface relative overflow-hidden"
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
      </div>
    </motion.div>
  );
}

/* ── Page 1: Case Info ── */
function CasePage({ caseData }: { caseData: Case }) {
  return (
    <div className="p-4 text-black">
      <div className="border border-black">
        <div className="border-b border-black p-2">
          <p className="text-[9px] uppercase tracking-wider font-bold mb-0.5">Nature of Crime</p>
          <p className="text-xs leading-relaxed">{caseData.crime}</p>
        </div>
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
        <div className="grid grid-cols-[1fr_auto]">
          <div className="p-2 border-r border-black">
            <p className="text-[9px] uppercase tracking-wider font-bold mb-0.5">Location</p>
            <p className="text-xs">{caseData.setting}</p>
          </div>
          <div className="p-2 min-w-[90px]">
            <p className="text-[9px] uppercase tracking-wider font-bold mb-0.5">Case No.</p>
            <p className="text-xs">{caseData.case_number}</p>
          </div>
        </div>
      </div>
      <div className="mt-4 p-3 border border-black/20">
        <p className="text-[9px] uppercase tracking-wider font-bold mb-1">Briefing</p>
        <p className="text-xs leading-relaxed text-black/70">{caseData.briefing}</p>
      </div>
    </div>
  );
}

/* ── Page 3: Exchange Log ── */
function LogPage({ conversationHistory, suspectName, logEndRef }: {
  conversationHistory: ConversationMessage[]; suspectName: string;
  logEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="p-3 space-y-2 h-full bg-black/[0.03]">
      {conversationHistory.length === 0 && (
        <p className="text-xs italic text-black/40 text-center py-4">No exchanges yet.</p>
      )}
      {conversationHistory.map((msg, i) => {
        const isLast = i === conversationHistory.length - 1;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.03 }}
            className={`text-xs ${isLast ? 'text-black' : 'text-black/40'}`}
          >
            <span className="font-bold">
              {msg.role === 'user' ? 'You' : suspectName?.split(' ')[0] ?? 'Suspect'}:
            </span>{' '}
            {msg.content}
          </motion.div>
        );
      })}
      <div ref={logEndRef} />
    </div>
  );
}

/* ── Page 2: Evidence + Hints ── */
function EvidencePage({ clues, clueIcons, cluesNeeded, hintsUsed, hintTexts }: {
  clues: string[]; clueIcons: string[]; cluesNeeded: number;
  hintsUsed: number; hintTexts: string[];
}) {
  return (
    <div className="p-4 text-black">
      <p className="text-[10px] uppercase tracking-wider font-bold text-center mb-3">
        {clues.length}/{cluesNeeded} Evidence Collected
      </p>

      {/* Icons */}
      <div className="flex items-center gap-3 justify-center flex-wrap mb-4">
        {clueIcons.map((icon, i) => (
          <div key={i} className={`w-20 h-20 border border-black/40 flex items-center justify-center transition-all duration-700 ${
            clues.length >= i + 1 ? 'bg-white' : 'grayscale opacity-30'
          }`}>
            <img src={icon} alt={`Evidence ${i + 1}`} className="w-14 h-14 object-contain" style={{ imageRendering: 'pixelated' }} />
          </div>
        ))}
      </div>

      {/* Clue details */}
      {clues.length > 0 && (
        <div className="border border-black/30 mb-4">
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
        </div>
      )}

      {clues.length === 0 && (
        <p className="text-xs italic text-black/50 text-center mb-4">
          Raise the suspect&apos;s stress to uncover evidence.
        </p>
      )}

      {/* Hints */}
      {hintsUsed > 0 && hintTexts.length > 0 && (
        <div className="border border-black/30">
          <div className="p-1.5 bg-black/5 border-b border-black/30">
            <p className="text-[10px] uppercase tracking-wider font-bold text-center">Hints</p>
          </div>
          {hintTexts.map((trigger, i) => (
            <div key={i} className={`p-2 ${i < hintTexts.length - 1 ? 'border-b border-black/30' : ''}`}>
              <p className="text-xs">Try asking about: {trigger}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
