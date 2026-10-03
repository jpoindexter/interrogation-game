import { allowsLawyerEscalation } from './play-mode';
import { acceptedTimestamp } from './accepted-time';
import { recordGameplayTurn } from '../gameplay/state';
import { gameplayProjection } from '../gameplay/session';
import { DIFFICULTY_CLUES, TIME_LIMITS } from '../game-state';
import { getSessionStats } from './stats';
import { inspectDisclosure } from './disclosure';
import { acceptClue, beginSession, expireSession, finishSession } from './transitions';
import type { GameSession, Outcome } from './types';

const MIN_QUESTIONS: Record<string, number> = { easy: 2, medium: 4, hard: 6, expert: 8 };
export interface SuspectResponse {
  spoken_response: string;
  stress_level: number;
  clue_unlocked: string | null;
  caught: boolean;
}

export function validateSuspectResponse(raw: Record<string, unknown>): SuspectResponse {
  if (typeof raw.spoken_response !== 'string' || !raw.spoken_response.trim()
    || typeof raw.stress_level !== 'number' || !Number.isFinite(raw.stress_level)
    || (raw.clue_unlocked !== null && typeof raw.clue_unlocked !== 'string')) {
    throw new Error('Invalid suspect response; retry the question');
  }
  return {
    spoken_response: raw.spoken_response.slice(0, 2000),
    stress_level: raw.stress_level, clue_unlocked: raw.clue_unlocked?.slice(0, 500) ?? null,
    caught: false,
  };
}

export function sessionProjection(session: GameSession) {
  return {
    gameplay: gameplayProjection(session), clues: session.clues, cluesCollected: session.clues.length, status: session.status,
    outcome: session.outcome, startedAt: session.startTime, endedAt: session.endedAt,
    timerMode: session.timerMode, timeLimit: session.timerMode === 'unlimited' ? null : TIME_LIMITS[String(session.caseData.difficulty)],
    timeElapsed: getSessionStats(session.id)?.timeElapsed ?? 0,
  };
}

export function terminalResponse(session: GameSession) {
  return {
    spoken_response: session.outcome === 'lose_lawyer'
      ? "That's it. I'm done talking. I want my lawyer — now. This interview is over."
      : "This interview is over, detective.",
    stress_level: session.currentStress, clue_unlocked: null, caught: false,
    timeExpired: session.outcome === 'lose_time', lawyered_up: session.outcome === 'lose_lawyer',
    ...sessionProjection(session),
  };
}

/** Only explicit session actions can end a game; player dialogue is never a control command. */
export function prepareTurn(session: GameSession): Outcome | null {
  expireSession(session);
  if (session.outcome) return session.outcome;
  beginSession(session);
  return null;
}

function canUnlock(session: GameSession, question: string, stress: number): boolean {
  const difficulty = String(session.caseData.difficulty);
  const maxClues = DIFFICULTY_CLUES[difficulty] ?? 3;
  const next = session.clues.length + 1;
  const threshold = Math.round(2 + ((next - 1) * 6) / Math.max(1, maxClues - 1));
  return !question.startsWith('*') && session.questionsAsked >= (MIN_QUESTIONS[difficulty] ?? 4)
    && question.replace(/[^a-zA-Z]/g, '').length >= 15 && next <= maxClues && stress >= threshold;
}

function filterResponse(session: GameSession, response: SuspectResponse): SuspectResponse {
  if (inspectDisclosure(session, response.spoken_response) === 'allowed') {
    return response.clue_unlocked && inspectDisclosure(session, response.clue_unlocked) !== 'allowed'
      ? { ...response, clue_unlocked: null } : response;
  }
  return { ...response, spoken_response: 'I... I need a moment. Can we move on to something else?', clue_unlocked: null };
}

function applyStressConsequence(session: GameSession, response: SuspectResponse, stress: number) {
  const lawyerEligible = allowsLawyerEscalation(session.timerMode, session.caseData.playMode, session.caseData.difficulty);
  session.highStressStreak = stress >= 8 ? session.highStressStreak + 1 : 0;
  if (lawyerEligible && session.highStressStreak >= 4) {
    finishSession(session, 'lose_lawyer');
    response.spoken_response = terminalResponse(session).spoken_response;
  }
}

export function commitTurn(session: GameSession, question: string, raw: Record<string, unknown>, options: { recordGameplay?: boolean } = {}) {
  expireSession(session);
  if (session.outcome) return terminalResponse(session);
  const response = filterResponse(session, validateSuspectResponse(raw));
  const stress = Math.max(session.currentStress, Math.min(Math.floor(response.stress_level), session.currentStress + 1, 9));
  response.stress_level = stress;
  const clue = session.gameplay ? null : response.clue_unlocked;
  response.clue_unlocked = clue && canUnlock(session, question, stress) && acceptClue(session, clue) ? clue : null;
  session.currentStress = stress;
  applyStressConsequence(session, response, stress);
  if (!question.startsWith('*')) session.questionsAsked += 1;
  const timestamp = acceptedTimestamp(session);
  session.conversationHistory.push({ role: 'user', kind: 'question', content: question, timestamp },
    { role: 'assistant', content: response.spoken_response, timestamp, ...(session.outcome ? { kind: 'terminal' as const } : {}) });
  recordAcceptedGameplay(session, { question, answer: response.spoken_response }, options.recordGameplay);
  return { ...response, lawyered_up: session.outcome === 'lose_lawyer', ...sessionProjection(session) };
}

function recordAcceptedGameplay(session: GameSession, exchange: { question: string; answer: string }, enabled?: boolean) {
  if (session.gameplay && enabled !== false && !session.outcome) recordGameplayTurn(session.gameplay, exchange);
}
