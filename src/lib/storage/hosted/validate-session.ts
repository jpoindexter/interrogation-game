import type { SessionRecord } from '../../session/repository-types';
import type { GameSession } from '../../session/types';
import { validateCaseData } from '../../session/case-validation';
import { isPlayMode, playModeRules, allowsLawyerEscalation } from '../../session/play-mode';
import { isPortraitId } from '../../art/portraits';
import { TIME_LIMITS } from '../../game-state';
import type { HostedSnapshot } from './contracts';
import { parseSnapshot } from './contracts';
import { check, count, list, provenance, record, strings, text, unique } from './validation';
import { validateHostedGameplay } from './validate-gameplay';
import { validateHostedResult } from './validate-result';

function validateCase(value: unknown, timerMode: unknown): void {
  const data = record(value);
  check(validateCaseData(data));
  if (data.playMode !== undefined) {
    check(isPlayMode(data.playMode));
    check(playModeRules(data.playMode).timerMode === timerMode);
  }
  if (data.portraitId !== undefined) check(isPortraitId(data.portraitId));
  if (data.mode !== undefined) check(data.mode === 'redteam');
  if (data.requiredClues !== undefined) check(data.mode === 'redteam' && data.requiredClues === 1);
}

function validateCounters(session: Record<string, unknown>): void {
  const counters = ['questionsAsked', 'hintsUsed', 'cluesCollected', 'totalPriorGames', 'highStressStreak'];
  check(counters.every(key => count(session[key])));
  check(count(session.accusationsLeft, 3) && count(session.accusationsUsed, 3));
  check(session.accusationsLeft + session.accusationsUsed === 3 && count(session.currentStress, 9));
  strings(session.learnedTactics);
  if (session.hintTexts !== undefined) check(strings(session.hintTexts).length <= Number(session.hintsUsed));
  const clues = list(session.clues).map(record);
  check(clues.length === session.cluesCollected);
  clues.forEach((clue, index) => {
    check(clue.id === `clue-${index + 1}` && text(clue.text));
    check(clue.origin === undefined || clue.origin === 'case-record');
  });
  check(clues.filter(clue => clue.origin === 'case-record').length <= 1);
}

function validateLifecycle(session: Record<string, unknown>): void {
  check(count(session.createdAt) && count(session.lastActivity) && count(session.startTime));
  check(session.lastActivity >= session.createdAt);
  check(session.startTime === 0 || session.startTime >= session.createdAt);
  check(['countdown', 'unlimited'].includes(String(session.timerMode)));
  validateStatus(session);
}

function validateStatus(session: Record<string, unknown>): void {
  if (session.status === 'briefing' || session.status === 'active') {
    check(session.outcome === null && session.endedAt === null);
    check(session.status === 'briefing' ? session.startTime === 0 : Number(session.startTime) > 0);
    check(session.acceptedAccusation === null && session.winToken === null && session.evaluation === null);
    return;
  }
  validateTerminalStatus(session);
}

function validateTerminalStatus(session: Record<string, unknown>): void {
  check(count(session.endedAt) && session.endedAt >= Number(session.createdAt) && session.endedAt >= Number(session.startTime));
  if (session.status === 'won') return check(session.outcome === 'win' && Number(session.startTime) > 0);
  check(session.status === 'lost');
  check(['lose_accusations', 'lose_time', 'lose_giveup', 'lose_lawyer'].includes(String(session.outcome)));
  check(session.acceptedAccusation === null && session.winToken === null);
  check(session.outcome === 'lose_giveup' || Number(session.startTime) > 0);
}

function validateOutcome(session: GameSession): void {
  if (session.outcome === 'win') {
    const accepted = record(session.acceptedAccusation);
    check(text(accepted.text) && text(accepted.explanation) && session.accusationsUsed > 0);
  }
  if (session.outcome === 'lose_accusations') check(session.accusationsLeft === 0);
  if (!session.outcome) check(session.accusationsLeft > 0);
  if (session.outcome === 'lose_time') {
    check(session.timerMode === 'countdown');
    check(session.endedAt === session.startTime + TIME_LIMITS[String(session.caseData.difficulty)] * 1000);
  }
  if (session.outcome === 'lose_lawyer') {
    check(allowsLawyerEscalation(session.timerMode, session.caseData.playMode, session.caseData.difficulty));
    check(session.highStressStreak >= 4 && session.currentStress >= 8);
  }
}

function validateConversation(session: Record<string, unknown>): void {
  const messages = list(session.conversationHistory).map(record);
  let timestamp = 0;
  for (const message of messages) {
    check(['user', 'assistant'].includes(String(message.role)) && text(message.content));
    if (message.timestamp !== undefined) {
      check(count(message.timestamp) && message.timestamp >= timestamp);
      timestamp = message.timestamp;
    }
    validateMessageKind(message, session);
  }
  if (session.status === 'briefing') {
    check(messages.length === 0 && session.questionsAsked === 0 && session.accusationsUsed === 0);
  }
  const questions = messages.filter(message => message.role === 'user' && message.kind === 'question');
  const legacy = messages.some(message => message.role === 'user' && message.kind === undefined);
  if (!legacy) check(questions.filter(message => !(message.content as string).startsWith('*')).length === session.questionsAsked);
}

function validateMessageKind(message: Record<string, unknown>, session: Record<string, unknown>): void {
  if (message.kind !== undefined) check(['question', 'accusation', 'terminal'].includes(String(message.kind)));
  if (message.kind === 'terminal') check(message.role === 'assistant' && session.outcome !== null);
  if (message.kind === 'question' || message.kind === 'accusation') check(message.role === 'user');
  if (message.accusationAttempt !== undefined) {
    check(message.kind === 'accusation' && count(message.accusationAttempt, Number(session.accusationsUsed)));
    check(message.accusationAttempt > 0);
  }
}

function validateEventSource(turn: Record<string, unknown>, session: GameSession): void {
  const message = session.conversationHistory[Number(turn.messageIndex)];
  check(message?.role === 'user' && message.kind === 'question' && message.content === turn.question);
  check(message.timestamp === turn.timestamp);
  const clues = strings(turn.addedClueIds);
  unique(clues);
  check(clues.every(id => session.clues.some(clue => clue.id === id)));
  if (turn.provenance !== undefined) provenance(turn.provenance);
}

function validateAcceptedTurns(session: GameSession): void {
  if (session.caseProvenance !== undefined) list(session.caseProvenance).forEach(provenance);
  if (session.acceptedTurns === undefined) return;
  const turns = list(session.acceptedTurns).map(record);
  let prior = -1;
  for (const turn of turns) {
    check(count(turn.messageIndex) && turn.messageIndex > prior);
    prior = turn.messageIndex;
    check(turn.id === `accepted-turn:${turn.messageIndex}` && count(turn.timestamp));
    check(count(turn.stressBefore, 9) && count(turn.stressAfter, 9));
    check(turn.stressAfter >= turn.stressBefore && turn.stressAfter <= turn.stressBefore + 1);
    validateEventSource(turn, session);
  }
}

/** Storage is untrusted input; preserve valid legacy optional fields without inventing facts. */
export function parseHostedSessionRecord(snapshot: HostedSnapshot): SessionRecord {
  const envelope = record(snapshot);
  const value = record(envelope.session);
  check(typeof value.id === 'string' && /^[a-f0-9]{48}$/.test(value.id));
  parseSnapshot(envelope, value.id);
  validateCase(value.caseData, value.timerMode);
  validateCounters(value);
  validateLifecycle(value);
  validateConversation(value);
  // Each remaining optional domain field is checked before returning the typed record.
  const session = value as unknown as GameSession;
  validateOutcome(session);
  validateAcceptedTurns(session);
  validateHostedGameplay(session);
  validateHostedResult(session, envelope.token);
  return structuredClone(snapshot) as unknown as SessionRecord;
}
