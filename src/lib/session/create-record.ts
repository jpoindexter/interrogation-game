import type { SessionRecord } from './repository-types';

export interface CreateSessionOptions {
  sessionId: string;
  caseData: Record<string, unknown>;
  learnedTactics?: string[];
  totalPriorGames?: number;
  timerMode?: 'countdown' | 'unlimited';
}

/** Pure initial state. A caller with durable intent supplies its original creation time. */
export function createSessionRecord(options: CreateSessionOptions, createdAt = Date.now()): SessionRecord {
  if (!/^[a-f0-9]{48}$/.test(options.sessionId) || !Number.isSafeInteger(createdAt) || createdAt < 0) {
    throw new Error('Invalid session creation identity');
  }
  const { sessionId: id, caseData, learnedTactics = [], totalPriorGames = 0, timerMode = 'countdown' } = options;
  return { version: 1, revision: 0, requests: {}, session: {
    id, caseData: structuredClone(caseData), learnedTactics: [...learnedTactics], totalPriorGames, timerMode,
    conversationHistory: [], accusationsLeft: 3, accusationsUsed: 0, currentStress: 0, winToken: null,
    createdAt, lastActivity: createdAt, cluesCollected: 0, clues: [], startTime: 0, endedAt: null,
    status: 'briefing', outcome: null, questionsAsked: 0, hintsUsed: 0, highStressStreak: 0,
    acceptedAccusation: null, evaluation: null,
  } };
}
