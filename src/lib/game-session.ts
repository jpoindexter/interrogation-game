// Server-side game session store
// Keeps case secrets + conversation history on the server so the client never sees answers

import { randomBytes } from 'crypto';
import type { ConversationMessage } from './mistral';

export interface GameSession {
  id: string;
  caseData: Record<string, unknown>;
  conversationHistory: ConversationMessage[];
  accusationsLeft: number;
  currentStress: number;
  winToken: string | null; // Set when player wins — required for leaderboard submission
  createdAt: number;
  lastActivity: number;
}

const sessions = new Map<string, GameSession>();

const SESSION_TTL = 60 * 60 * 1000; // 1 hour
const MAX_SESSIONS = 5000;

export function createSession(caseData: Record<string, unknown>): string {
  // Enforce max sessions to prevent memory exhaustion
  if (sessions.size >= MAX_SESSIONS) {
    pruneOldest(Math.floor(MAX_SESSIONS * 0.2));
  }

  const id = randomBytes(24).toString('hex');
  sessions.set(id, {
    id,
    caseData,
    conversationHistory: [],
    accusationsLeft: 3,
    currentStress: 0,
    winToken: null,
    createdAt: Date.now(),
    lastActivity: Date.now(),
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
  // Cap conversation at 100 messages
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

// Win tokens live in a separate Map so they survive session deletion.
// Flow: accuse → issueWinToken → evaluate (deletes session) → leaderboard (consumes token)
const winTokens = new Map<string, { token: string; issuedAt: number }>();
const WIN_TOKEN_TTL = 30 * 60 * 1000; // 30 minutes

/** Issue a one-time win token when the player wins. Returns the token or null if already issued. */
export function issueWinToken(sessionId: string): string | null {
  const session = getSession(sessionId);
  if (!session || session.winToken) return null; // Already issued
  const token = randomBytes(16).toString('hex');
  session.winToken = token;
  // Store in standalone Map so it survives session deletion
  winTokens.set(sessionId, { token, issuedAt: Date.now() });
  return token;
}

/** Validate and consume a win token. Returns true if valid. Token is single-use.
 *  Checks standalone Map first (survives session deletion), falls back to session. */
export function consumeWinToken(sessionId: string, token: string): boolean {
  // Check standalone token store (primary — works after session deletion)
  const stored = winTokens.get(sessionId);
  if (stored) {
    if (Date.now() - stored.issuedAt > WIN_TOKEN_TTL) {
      winTokens.delete(sessionId);
      return false;
    }
    if (stored.token === token) {
      winTokens.delete(sessionId); // Consume — single use
      return true;
    }
    return false;
  }
  // Fallback: check session (if not yet deleted)
  const session = getSession(sessionId);
  if (!session || !session.winToken || session.winToken !== token) return false;
  session.winToken = null;
  return true;
}

// Per-session locks to prevent race conditions (concurrent accusation requests)
const sessionLocks = new Set<string>();

/** Acquire a lock for a session. Returns true if acquired, false if already locked. */
export function acquireSessionLock(sessionId: string): boolean {
  if (sessionLocks.has(sessionId)) return false;
  sessionLocks.add(sessionId);
  return true;
}

/** Release a session lock. */
export function releaseSessionLock(sessionId: string): void {
  sessionLocks.delete(sessionId);
}

export function updateStress(sessionId: string, stress: number): void {
  const session = getSession(sessionId);
  if (!session) return;
  session.currentStress = Math.max(0, Math.min(9, Math.floor(stress)));
}

export function deleteSession(id: string): void {
  sessions.delete(id);
}

/** Strip secret fields from case data for client consumption */
export function sanitizeCaseForClient(caseData: Record<string, unknown>): Record<string, unknown> {
  const {
    suspect_true_story: _1,
    the_lie: _2,
    the_truth: _3,
    the_contradiction: _4,
    deflection_tactics: _5,
    ...safe
  } = caseData;
  // Keep stress_triggers — they're used for the hint system (not the actual lie/truth)
  return safe;
}

function pruneOldest(count: number): void {
  const entries = Array.from(sessions.entries())
    .sort((a, b) => a[1].lastActivity - b[1].lastActivity);
  for (let i = 0; i < Math.min(count, entries.length); i++) {
    sessions.delete(entries[i][0]);
  }
}

// Periodic cleanup every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - SESSION_TTL;
  for (const [key, session] of sessions) {
    if (session.lastActivity < cutoff) sessions.delete(key);
  }
  // Clean up expired win tokens
  const tokenCutoff = Date.now() - WIN_TOKEN_TTL;
  for (const [key, entry] of winTokens) {
    if (entry.issuedAt < tokenCutoff) winTokens.delete(key);
  }
}, 300000);
