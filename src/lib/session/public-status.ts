import { sanitizeCaseForClient } from './public-case';
import { getSessionRecord } from './store';
import { getSessionStats } from './stats';
import { projectResult } from './result';
import { sessionProjection } from './turn';
import type { GameSession } from './types';
export function publicSessionStatus(session: GameSession) {
  const caseData = sanitizeCaseForClient(session.caseData);
  const requests = getSessionRecord(session.id)?.requests ?? {};
  return { caseData: { ...caseData, sessionId: session.id }, conversationHistory: session.conversationHistory,
    ...sessionProjection(session), accusationsLeft: session.accusationsLeft, accusationsUsed: session.accusationsUsed,
    hintsUsed: session.hintsUsed, hintTexts: session.hintTexts ?? [], questionsAsked: session.questionsAsked, stressLevel: session.currentStress,
    stats: getSessionStats(session.id), winToken: session.outcome === 'win' ? session.winToken : undefined,
    result: session.outcome ? projectResult(session) : undefined,
    pendingRequests: Object.entries(requests).filter(([, entry]) => entry.state === 'pending')
      .map(([requestId, entry]) => ({ requestId, startedAt: entry.startedAt })),
  };
}
