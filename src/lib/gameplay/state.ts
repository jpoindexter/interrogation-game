import { requireCondition } from './errors';
import { validateGameplayCase } from './case-validation';
import type { GameplayCase, GameplayState, RecordedStatement, RecordedTurn } from './types';

export function createGameplayState(sessionId: string, caseData: GameplayCase): GameplayState {
  validateGameplayCase(caseData);
  requireCondition(/^[a-zA-Z0-9-]{1,80}$/.test(sessionId), 'INVALID_SESSION', 'A valid session ID is required.');
  return {
    sessionId, caseId: caseData.id, status: 'active', turns: [], statements: [],
    disclosedExhibitIds: caseData.exhibits.filter(exhibit => exhibit.initiallyDisclosed).map(exhibit => exhibit.id),
    establishedContradictionIds: [], establishedChallenges: [], nextAttempt: 1, receipts: {}, pending: null,
  };
}

export function recordGameplayTurn(
  state: GameplayState, exchange: { question: string; answer: string; timestamp?: number },
): RecordedTurn {
  requireCondition(state.status === 'active', 'SESSION_ENDED', 'This interrogation has ended.');
  requireCondition(exchange.answer.trim() && exchange.answer.length <= 2000,
    'INVALID_RESPONSE', 'The suspect response is empty or too long.');
  const turn = { id: `${state.sessionId}:turn:${state.turns.length + 1}`,
    question: exchange.question, answer: exchange.answer, timestamp: exchange.timestamp ?? Date.now() };
  state.turns.push(turn);
  return { ...turn };
}

export function pinStatement(state: GameplayState, turnId: string, quote?: string): RecordedStatement {
  requireCondition(state.status === 'active', 'SESSION_ENDED', 'This interrogation has ended.');
  const turn = state.turns.find(item => item.id === turnId);
  requireCondition(turn, 'UNKNOWN_SOURCE', 'Choose a statement from this interrogation.');
  const selected = quote?.trim() || turn.answer;
  requireCondition(turn.answer.includes(selected), 'INVALID_QUOTE', 'The quote must match the recorded response exactly.');
  const existing = state.statements.find(item => item.turnId === turnId && item.quote === selected);
  if (existing) return { ...existing };
  const statement = { id: `${state.sessionId}:statement:${state.statements.length + 1}`,
    turnId, quote: selected, claimId: null };
  state.statements.push(statement);
  return { ...statement };
}

/** Only authored whole-turn assertions can get a deterministic claim binding. */
export function bindAuthoredStatement(state: GameplayState, caseData: GameplayCase, statementId: string): void {
  requireCondition(state.caseId === caseData.id, 'CASE_MISMATCH', 'Case does not match this interrogation.');
  const statement = state.statements.find(item => item.id === statementId);
  const turn = state.turns.find(item => item.id === statement?.turnId);
  requireCondition(statement && turn, 'UNKNOWN_SOURCE', 'The statement is not recorded.');
  const claim = caseData.claims.find(item => [item.assertion, ...item.alternateAssertions].includes(turn.answer));
  // Embedded/quoted/negated snippets do not establish that the suspect asserted a claim.
  requireCondition(claim && statement.quote === turn.answer, 'UNBOUND_STATEMENT',
    'This statement has no reviewed factual binding; it can still be discussed.');
  statement.claimId = claim.id;
}
