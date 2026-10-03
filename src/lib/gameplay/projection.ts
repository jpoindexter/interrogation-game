import { requireCondition } from './errors';
import type { GameplayCase, GameplayState, PublicGameplayProjection } from './types';

export function publicGameplayState(state: GameplayState, caseData: GameplayCase): PublicGameplayProjection {
  requireCondition(state.caseId === caseData.id, 'CASE_MISMATCH', 'Case does not match this interrogation.');
  return {
    caseId: caseData.id, title: caseData.title, briefing: caseData.briefing,
    status: state.status, turns: state.turns.map(turn => ({ ...turn, reviewed: caseData.claims.some(claim =>
      [claim.assertion, ...claim.alternateAssertions].includes(turn.answer)) })),
    statements: state.statements.map(({ id, turnId, quote, claimId }) => ({ id, turnId, quote, reviewed: claimId !== null })),
    exhibits: caseData.exhibits.filter(exhibit => state.disclosedExhibitIds.includes(exhibit.id))
      .map(({ id, title, kind, text }) => ({ id, title, kind, text })),
    establishedCount: state.establishedContradictionIds.length,
  };
}

/** Evidence summary is available only after the actual game's authoritative terminal state. */
export function projectEvidenceResult(state: GameplayState, caseData: GameplayCase) {
  requireCondition(state.status === 'ended', 'RESULT_NOT_READY', 'End the interrogation before revealing case facts.');
  requireCondition(state.caseId === caseData.id, 'CASE_MISMATCH', 'Case does not match this interrogation.');
  return state.establishedContradictionIds.map(id => {
    const link = caseData.contradictions.find(item => item.id === id);
    requireCondition(link, 'INVALID_REFERENCE', 'Recorded contradiction has no case source.');
    const claim = caseData.claims.find(item => item.id === link.claimId)!;
    const exhibit = caseData.exhibits.find(item => item.id === link.exhibitId)!;
    const proof = state.establishedChallenges.find(item => item.contradictionId === id);
    const statement = state.statements.find(item => item.id === proof?.statementId);
    requireCondition(statement, 'INVALID_REFERENCE', 'The challenged statement is not recorded.');
    return { contradictionId: id, assertion: claim.assertion, truth: claim.truth,
      statement: { id: statement.id, turnId: statement.turnId, quote: statement.quote },
      exhibit: { id: exhibit.id, title: exhibit.title, text: exhibit.text }, explanation: link.explanation };
  });
}

export type { PublicGameplayProjection } from './types';
