'use client';

import { useRef, type ReactNode } from 'react';
import { ConversationPath } from '../result/ConversationPath';
import { openRecordedExchange } from '../result/open-recorded-exchange';
import type { Evaluation, GameResult } from '../result/types';
import CaseDetails from './CaseDetails';
import ScoreBreakdown from './ScoreBreakdown';

export default function WinReveal({ result, evaluation, children }: {
  result: GameResult; evaluation: Evaluation; children?: ReactNode;
}) {
  const exchange = useRef<HTMLDetailsElement>(null);
  const accepted = evaluation.conversationPath?.findLast(node => node.kind === 'accusation' && node.status === 'supported');
  return <>
    <CaseDetails suspectName={result.caseData.suspect_name} suspectRole={result.caseData.suspect_role}
      confession={result.confession} evaluation={evaluation} accepted={accepted}
      onOpenExchange={() => openRecordedExchange(exchange.current)} />
    <ConversationPath evaluation={evaluation} focusEntry={accepted ? { id: accepted.id, ref: exchange } : undefined} />
    <ScoreBreakdown stats={evaluation.stats} />
    {children}
  </>;
}
