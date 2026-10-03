import type { GameSession } from '../../session/types';

export interface QuestionEvidence {
  question: string;
  source: 'accepted_clue' | 'authored_contradiction';
  turnId: string;
  clueIds: string[];
  actionId?: string;
  statementId?: string;
  exhibitId?: string;
  contradictionId?: string;
}
/** Legacy history is never retroactively inferred to have caused clues or stress. */
export function acceptedTurnEvents(session: GameSession) {
  return (session.acceptedTurns ?? []).filter(event => {
    const message = session.conversationHistory[event.messageIndex];
    return message?.role === 'user' && message.kind === 'question' && message.content === event.question
      && message.timestamp === event.timestamp;
  });
}
function authoredEvidence(session: GameSession): QuestionEvidence[] {
  const state = session.gameplay;
  if (!state) return [];
  return state.establishedChallenges.flatMap(challenge => {
    const result = state.receipts[challenge.actionId]?.result;
    const turn = state.turns.find(item => item.id === result?.turnId);
    if (!result?.progressAdded || result.status !== 'contradiction_established' || !turn
      || result.statementId !== challenge.statementId || result.exhibitId !== challenge.exhibitId) return [];
    return [{ question: turn.question, source: 'authored_contradiction' as const, turnId: turn.id,
      clueIds: [], ...challenge }];
  });
}
export function questionEvidence(session: GameSession): QuestionEvidence[] {
  const clues = new Set(session.clues.map(clue => clue.id));
  const generated = acceptedTurnEvents(session).flatMap(event => {
    const clueIds = event.addedClueIds.filter(id => clues.has(id));
    return clueIds.length && !event.question.startsWith('*')
      ? [{ question: event.question, source: 'accepted_clue' as const, turnId: event.id, clueIds }] : [];
  });
  return [...generated, ...authoredEvidence(session)];
}
