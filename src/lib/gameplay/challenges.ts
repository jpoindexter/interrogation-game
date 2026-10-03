import { requireCondition } from './errors';
import { parseDialogueAction } from './dialogue';
import { recordGameplayTurn } from './state';
import type { DialogueAction, DialogueResult, GameplayCase, GameplayState } from './types';

export type PreparedAction =
  | { kind: 'ready'; action: DialogueAction; attempt: number; sourceQuote: string; exhibitText: string | null }
  | { kind: 'replay'; result: DialogueResult }
  | { kind: 'pending' };

function validateReferences(state: GameplayState, caseData: GameplayCase, action: DialogueAction) {
  requireCondition(state.caseId === caseData.id, 'CASE_MISMATCH', 'Case does not match this interrogation.');
  const statement = state.statements.find(item => item.id === action.statementId);
  requireCondition(statement, 'UNKNOWN_SOURCE', 'Select a statement from this interrogation.');
  if (action.kind !== 'present_evidence') return { statement, exhibit: null };
  const exhibit = caseData.exhibits.find(item => item.id === action.exhibitId);
  requireCondition(exhibit && state.disclosedExhibitIds.includes(exhibit.id),
    'UNAVAILABLE_EVIDENCE', 'This exhibit is not available in this interrogation.');
  return { statement, exhibit };
}

export function prepareDialogueAction(state: GameplayState, caseData: GameplayCase, input: unknown): PreparedAction {
  const action = parseDialogueAction(input);
  const fingerprint = JSON.stringify(action);
  const receipt = Object.hasOwn(state.receipts, action.id) ? state.receipts[action.id] : undefined;
  if (receipt) {
    requireCondition(receipt.fingerprint === fingerprint, 'ACTION_CONFLICT', 'This action ID was already used for another question.');
    return { kind: 'replay', result: structuredClone(receipt.result) };
  }
  requireCondition(state.status === 'active', 'SESSION_ENDED', 'This interrogation has ended.');
  const { statement, exhibit } = validateReferences(state, caseData, action);
  if (state.pending) {
    requireCondition(state.pending.fingerprint === fingerprint, 'ACTION_BUSY', 'Another dialogue action is in progress.');
    return { kind: 'pending' };
  }
  const attempt = state.nextAttempt++;
  state.pending = { action, fingerprint, attempt };
  return { kind: 'ready', action: { ...action }, attempt, sourceQuote: statement.quote, exhibitText: exhibit?.text ?? null };
}

function assessChallenge(state: GameplayState, caseData: GameplayCase, action: DialogueAction) {
  const { statement } = validateReferences(state, caseData, action);
  if (action.kind === 'present_evidence' && !statement.claimId) {
    return { status: 'unreviewed_statement' as const, linkId: null,
      explanation: 'This live wording has not been reviewed, so this comparison cannot establish progress. It has not been judged wrong. Select the original opening account marked Reviewed wording to assess an exhibit.' };
  }
  const link = action.kind === 'present_evidence' ? caseData.contradictions.find(item =>
    item.claimId === statement.claimId && item.exhibitId === action.exhibitId) : null;
  if (link) return { status: 'contradiction_established' as const, explanation: link.explanation, linkId: link.id };
  return action.kind === 'present_evidence'
    ? { status: 'not_established' as const, explanation: 'This exhibit does not establish a contradiction with that recorded statement.', linkId: null }
    : { status: 'dialogue_only' as const, explanation: 'The conversation continued. No evidence claim was established by this action.', linkId: null };
}

function validatePendingResponse(state: GameplayState, response: { actionId: string; attempt: number; answer: string }): void {
  requireCondition(state.pending?.action.id === response.actionId && state.pending.attempt === response.attempt,
    'UNKNOWN_ACTION', 'Prepare this action before accepting a response.');
  requireCondition(typeof response.answer === 'string' && response.answer.trim() && response.answer.length <= 2000,
    'INVALID_RESPONSE', 'The response could not be accepted. Retry the question.');
}

/** Call after the provider boundary has accepted the same text the player sees/hears. */
export function commitDialogueAction(
  state: GameplayState, caseData: GameplayCase, response: { actionId: string; attempt: number; answer: string },
): DialogueResult {
  const { actionId, answer } = response;
  const receipt = Object.hasOwn(state.receipts, actionId) ? state.receipts[actionId] : undefined;
  if (receipt) return structuredClone(receipt.result);
  requireCondition(state.status === 'active', 'SESSION_ENDED', 'This interrogation has ended.');
  validatePendingResponse(state, response);
  const { action, fingerprint } = state.pending!;
  const assessment = assessChallenge(state, caseData, action);
  const progressAdded = Boolean(assessment.linkId && !state.establishedContradictionIds.includes(assessment.linkId));
  const turn = recordGameplayTurn(state, { question: action.question, answer });
  if (progressAdded && assessment.linkId && action.exhibitId) {
    state.establishedContradictionIds.push(assessment.linkId);
    state.establishedChallenges.push({ contradictionId: assessment.linkId, statementId: action.statementId,
      exhibitId: action.exhibitId, actionId });
  }
  const result: DialogueResult = {
    actionId, turnId: turn.id, answer, statementId: action.statementId,
    ...(action.exhibitId ? { exhibitId: action.exhibitId } : {}), status: assessment.status,
    explanation: assessment.explanation, progressAdded, establishedCount: state.establishedContradictionIds.length,
  };
  state.receipts[actionId] = { fingerprint, result };
  state.pending = null;
  return structuredClone(result);
}

/** Provider errors/timeouts spend nothing. A late response after cancellation cannot commit. */
export function cancelDialogueAction(state: GameplayState, actionId: string, attempt: number): void {
  if (state.pending?.action.id === actionId && state.pending.attempt === attempt) state.pending = null;
}
