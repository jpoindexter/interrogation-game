import { useState, useEffect, useRef, type UIEvent } from 'react';
import type { PublicClue, ClueSource } from '@/lib/clue-contract';
import type { ConversationMessage } from '@/lib/game-ai';

export type CaseFilePage = 'case' | 'evidence' | 'log';
export function useCaseFileNavigation(clues: PublicClue[], hintCount: number, history: ConversationMessage[]) {
  const [page, setPage] = useState<CaseFilePage>('case');
  const [selectedSource, setSource] = useState<ClueSource | null>(null);
  const [seen, setSeen] = useState({ hints: hintCount, clues: clues.length });
  const source = clues.find(clue => clue.source?.turnId === selectedSource?.turnId)?.source ?? null;
  const logEndRef = useRef<HTMLDivElement | null>(null);
  const followLatest = useRef(true);
  if (seen.hints !== hintCount || seen.clues !== clues.length) {
    if (page !== 'log' && (hintCount > seen.hints || clues.length > seen.clues)) setPage('evidence');
    setSeen({ hints: hintCount, clues: clues.length });
  }
  useEffect(() => {
    if (page === 'log' && !source && followLatest.current) logEndRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [history, page, source]);
  return { page, source, logEndRef,
    changePage: (next: CaseFilePage) => { followLatest.current = true; setSource(null); setPage(next); },
    openSource: (origin: ClueSource) => { followLatest.current = false; setSource(origin); setPage('log'); },
    onScroll: (event: UIEvent<HTMLDivElement>) => {
      const panel = event.currentTarget;
      followLatest.current = panel.scrollHeight - panel.scrollTop - panel.clientHeight < 64;
    },
  };
}
