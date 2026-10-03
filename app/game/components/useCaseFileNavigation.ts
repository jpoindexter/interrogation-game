import { useState, useEffect, useRef, type UIEvent } from 'react';
import type { PublicClue, ClueSource } from '@/lib/clue-contract';
import type { ConversationMessage } from '@/lib/game-ai';

export type CaseFilePage = 'case' | 'evidence' | 'log';

export function useCaseFileNavigation(clues: PublicClue[], hintCount: number, history: ConversationMessage[]) {
  const [page, setPage] = useState<CaseFilePage>('case');
  const [selectedSource, setSource] = useState<ClueSource | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const source = clues.find(clue => clue.source?.turnId === selectedSource?.turnId)?.source ?? null;
  const logEndRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const focusLatest = useRef(false);
  const following = page === 'log' && !source && atBottom;
  const { unread, readReplies, markLeadsRead } = useCaseReadState({ history, leads: clues.length + hintCount, following });
  const sourceId = source?.turnId;
  useEffect(() => {
    if (sourceId && scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [sourceId]);
  useEffect(() => {
    if (following) logEndRef.current?.scrollIntoView({ behavior: 'instant' });
    if (following && focusLatest.current) {
      logEndRef.current?.focus({ preventScroll: true });
      focusLatest.current = false;
    }
  }, [history, following, readReplies]);
  return { page, source, logEndRef, scrollRef,
    unread,
    changePage: (next: CaseFilePage) => {
      setAtBottom(true); setSource(null); setPage(next);
      if (next === 'evidence') markLeadsRead();
    },
    openSource: (origin: ClueSource) => { setAtBottom(false); setSource(origin); setPage('log'); },
    showLeads: () => {
      setAtBottom(true); setSource(null); setPage('evidence'); markLeadsRead();
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
      scrollRef.current?.focus({ preventScroll: true });
    },
    showLatest: () => { focusLatest.current = true; setAtBottom(true); setSource(null); setPage('log'); },
    onScroll: (event: UIEvent<HTMLDivElement>) => {
      const panel = event.currentTarget;
      setAtBottom(panel.scrollHeight - panel.scrollTop - panel.clientHeight < 64);
    },
  };
}

function useCaseReadState({ history, leads, following }: {
  history: ConversationMessage[]; leads: number; following: boolean;
}) {
  const replies = history.filter(message => message.role === 'assistant' && message.content && !message.content.startsWith('*')).length;
  const [read, setRead] = useState({ replies, leads });
  if (following && read.replies !== replies) setRead({ ...read, replies });
  return {
    readReplies: read.replies,
    markLeadsRead: () => setRead(current => ({ ...current, leads })),
    unread: { replies: following ? 0 : Math.max(0, replies - read.replies), leads: Math.max(0, leads - read.leads) },
  };
}
