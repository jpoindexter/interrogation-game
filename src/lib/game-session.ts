import { randomBytes, timingSafeEqual } from 'crypto';
import type { ConversationMessage } from './mistral';
import { DIFFICULTY_CLUES } from './game-state';
import supabase from './db';
export { DIFFICULTY_CLUES };

export interface GameSession {
  id: string;
  caseData: Record<string, unknown>;
  conversationHistory: ConversationMessage[];
  accusationsLeft: number;
  currentStress: number;
  winToken: string | null;
  createdAt: number;
  lastActivity: number;
  cluesCollected: number;
  startTime: number;
  hintsUsed: number;
  accusationsUsed: number;
  learnedTactics: string[];
  totalPriorGames: number;
  /** Consecutive exchanges where stress stayed at 8+ (for lawyer-up mechanic) */
  highStressStreak: number;
}

interface WinTokenEntry {
  token: string;
  issuedAt: number;
  stats: { timeElapsed: number; hintsUsed: number; accusationsUsed: number; questionsAsked: number; difficulty: string };
}

const globalSessions = globalThis as typeof globalThis & {
  __gameSessions?: Map<string, GameSession>;
  __winTokens?: Map<string, WinTokenEntry>;
  __sessionLocks?: Set<string>;
};
if (!globalSessions.__gameSessions) globalSessions.__gameSessions = new Map();
if (!globalSessions.__winTokens) globalSessions.__winTokens = new Map();
if (!globalSessions.__sessionLocks) globalSessions.__sessionLocks = new Set();

const sessions = globalSessions.__gameSessions;

const SESSION_TTL = 60 * 60 * 1000; // 1 hour
const MAX_SESSIONS = 5000;

export function createSession(caseData: Record<string, unknown>, learnedTactics: string[] = [], totalPriorGames = 0): string {
  if (sessions.size >= MAX_SESSIONS) {
    pruneOldest(Math.floor(MAX_SESSIONS * 0.2));
  }

  const id = randomBytes(24).toString('hex');
  const now = Date.now();
  sessions.set(id, {
    id,
    caseData,
    conversationHistory: [],
    accusationsLeft: 3,
    currentStress: 0,
    winToken: null,
    createdAt: now,
    lastActivity: now,
    cluesCollected: 0,
    startTime: now,
    hintsUsed: 0,
    accusationsUsed: 0,
    learnedTactics,
    totalPriorGames,
    highStressStreak: 0,
  });
  return id;
}

export function getSession(id: string): GameSession | null {
  if (!id || typeof id !== 'string' || id.length !== 48) return null;
  const session = sessions.get(id);
  if (!session) return null;
  if (Date.now() - session.lastActivity > SESSION_TTL) {
    sessions.delete(id);
    return null;
  }
  session.lastActivity = Date.now();
  return session;
}

export function addMessage(sessionId: string, role: 'user' | 'assistant', content: string): void {
  const session = getSession(sessionId);
  if (!session) return;
  session.conversationHistory.push({ role, content });
  if (session.conversationHistory.length > 100) {
    session.conversationHistory = session.conversationHistory.slice(-100);
  }
}

export function useAccusation(sessionId: string): number {
  const session = getSession(sessionId);
  if (!session || session.accusationsLeft <= 0) return 0;
  session.accusationsLeft -= 1;
  return session.accusationsLeft;
}

export function restoreAccusation(sessionId: string): void {
  const session = getSession(sessionId);
  if (!session) return;
  session.accusationsLeft = Math.min(3, session.accusationsLeft + 1);
}

export function incrementClue(sessionId: string): number {
  const session = getSession(sessionId);
  if (!session) return 0;
  session.cluesCollected += 1;
  return session.cluesCollected;
}

export function incrementHint(sessionId: string): number {
  const session = getSession(sessionId);
  if (!session) return 0;
  session.hintsUsed += 1;
  return session.hintsUsed;
}

export function incrementAccusation(sessionId: string): number {
  const session = getSession(sessionId);
  if (!session) return 0;
  session.accusationsUsed += 1;
  return session.accusationsUsed;
}

/** Count real player questions (excludes system messages like opening, time-up, give-up). */
function countQuestions(history: ConversationMessage[]): number {
  return history.filter(m =>
    m.role === 'user' && !m.content.startsWith('*') && !m.content.startsWith('[Time') && !m.content.startsWith('[The detective'),
  ).length;
}

export function getSessionStats(sessionId: string): {
  timeElapsed: number;
  hintsUsed: number;
  accusationsUsed: number;
  questionsAsked: number;
  difficulty: string;
} | null {
  const session = getSession(sessionId);
  if (!session) return null;
  return {
    timeElapsed: (Date.now() - session.startTime) / 1000,
    hintsUsed: session.hintsUsed,
    accusationsUsed: session.accusationsUsed,
    questionsAsked: countQuestions(session.conversationHistory),
    difficulty: (session.caseData.difficulty as string) || 'medium',
  };
}

const winTokens = globalSessions.__winTokens!;
const WIN_TOKEN_TTL = 30 * 60 * 1000; // 30 minutes

export function issueWinToken(sessionId: string): string | null {
  const session = getSession(sessionId);
  if (!session || session.winToken) return null;
  const token = randomBytes(16).toString('hex');
  session.winToken = token;
  winTokens.set(sessionId, {
    token,
    issuedAt: Date.now(),
    stats: {
      timeElapsed: (Date.now() - session.startTime) / 1000,
      hintsUsed: session.hintsUsed,
      accusationsUsed: session.accusationsUsed,
      questionsAsked: countQuestions(session.conversationHistory),
      difficulty: (session.caseData.difficulty as string) || 'medium',
    },
  });
  return token;
}

export function getWinTokenStats(sessionId: string): WinTokenEntry['stats'] | null {
  const entry = winTokens.get(sessionId);
  return entry?.stats ?? null;
}

function safeTokenCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export function consumeWinToken(sessionId: string, token: string): boolean {
  const stored = winTokens.get(sessionId);
  if (stored) {
    if (Date.now() - stored.issuedAt > WIN_TOKEN_TTL) {
      winTokens.delete(sessionId);
      return false;
    }
    if (safeTokenCompare(stored.token, token)) {
      winTokens.delete(sessionId);
      return true;
    }
    return false;
  }
  const session = getSession(sessionId);
  if (!session || !session.winToken || !safeTokenCompare(session.winToken, token)) return false;
  session.winToken = null;
  return true;
}

const sessionLocks = globalSessions.__sessionLocks!;

export function acquireSessionLock(sessionId: string): boolean {
  if (sessionLocks.has(sessionId)) return false;
  sessionLocks.add(sessionId);
  return true;
}

export function releaseSessionLock(sessionId: string): void {
  sessionLocks.delete(sessionId);
}

export function updateStress(sessionId: string, stress: number): void {
  const session = getSession(sessionId);
  if (!session) return;
  session.currentStress = Math.max(0, Math.min(9, Math.floor(stress)));
}

/** Track consecutive high-stress exchanges. Returns true if suspect lawyers up. */
export function updateHighStressStreak(sessionId: string, stress: number): boolean {
  const session = getSession(sessionId);
  if (!session) return false;
  if (stress >= 8) {
    session.highStressStreak += 1;
  } else {
    session.highStressStreak = 0;
  }
  // Lawyer-up threshold: 4 consecutive exchanges at stress 8+
  return session.highStressStreak >= 4;
}

export function exportSession(
  sessionId: string,
  outcome: 'win' | 'lose_accusations' | 'lose_time' | 'lose_giveup' | 'lose_lawyer',
  accusationText?: string,
  accusationCorrect?: boolean,
): void {
  const session = getSession(sessionId);
  if (!session) return;
  const questionsAsked = countQuestions(session.conversationHistory);
  supabase.from('game_exports').upsert({
    session_id: sessionId,
    case_data: session.caseData,
    conversation: session.conversationHistory,
    outcome,
    difficulty: (session.caseData.difficulty as string) || 'medium',
    setting: (session.caseData.setting as string) || null,
    stats: {
      timeElapsed: (Date.now() - session.startTime) / 1000,
      hintsUsed: session.hintsUsed,
      accusationsUsed: session.accusationsUsed,
      questionsAsked,
      maxStress: session.currentStress,
      cluesCollected: session.cluesCollected,
    },
    accusation_text: accusationText ?? null,
    accusation_correct: accusationCorrect ?? null,
  }, { onConflict: 'session_id' }).then(({ error }) => {
    if (error) console.error('[exportSession] Failed:', error.message);
  });
}

export function deleteSession(id: string): void {
  sessions.delete(id);
}

export function sanitizeCaseForClient(caseData: Record<string, unknown>): Record<string, unknown> {
  const {
    suspect_true_story: _1,
    the_lie: _2,
    the_truth: _3,
    the_contradiction: _4,
    deflection_tactics: _5,
    stress_triggers: _6,
    ...safe
  } = caseData;
  return safe;
}

function pruneOldest(count: number): void {
  const entries = Array.from(sessions.entries())
    .sort((a, b) => a[1].lastActivity - b[1].lastActivity);
  for (let i = 0; i < Math.min(count, entries.length); i++) {
    sessions.delete(entries[i][0]);
  }
}

setInterval(() => {
  const cutoff = Date.now() - SESSION_TTL;
  for (const [key, session] of sessions) {
    if (session.lastActivity < cutoff) sessions.delete(key);
  }
  const tokenCutoff = Date.now() - WIN_TOKEN_TTL;
  for (const [key, entry] of winTokens) {
    if (entry.issuedAt < tokenCutoff) winTokens.delete(key);
  }
}, 300000);
