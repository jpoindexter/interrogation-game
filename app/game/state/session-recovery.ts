import type { PublicClue } from '@/lib/clue-contract';
import type { Case } from '@/lib/game-state';
import type { ConversationMessage } from '@/lib/game-ai';
import { parseSessionSnapshot } from './snapshot-validation';

export interface SessionSnapshot {
  gameplay?: import('../playbook/types').PublicGameplayProjection;
  caseData: Case;
  conversationHistory: ConversationMessage[];
  clues: PublicClue[];
  status: 'briefing' | 'active' | 'won' | 'lost';
  outcome: string | null;
  result?: unknown;
  startedAt: number;
  timerMode: 'countdown' | 'unlimited';
  accusationsLeft: number;
  hintsUsed: number;
  hintTexts?: string[];
  stressLevel: number;
  winToken?: string;
  pendingRequests: { requestId: string; startedAt: number }[];
}

export async function recoverSession(id: string, signal: AbortSignal): Promise<SessionSnapshot> {
  const response = await fetch(`/api/session?sessionId=${encodeURIComponent(id)}`, {
    cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
  });
  if (!response.ok) throw new Error(`Could not recover this session (HTTP ${response.status}). Retry or choose a new case.`);
  return parseSessionSnapshot(await response.json(), id);
}
