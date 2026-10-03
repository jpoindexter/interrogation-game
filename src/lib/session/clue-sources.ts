import type { PublicClue } from '../clue-contract';
import type { GameSession } from './types';

export function publicClues(session: GameSession): PublicClue[] {
  return session.clues.map(({ id, text }) => {
    const event = session.acceptedTurns?.find(turn => turn.addedClueIds.includes(id));
    if (!event) return { id, text, source: null };
    const question = session.conversationHistory[event.messageIndex];
    const answer = session.conversationHistory[event.messageIndex + 1];
    if (event.id !== `accepted-turn:${event.messageIndex}` || question?.role !== 'user'
      || question.content !== event.question || answer?.role !== 'assistant') return { id, text, source: null };
    return { id, text, source: { turnId: event.id, messageIndex: event.messageIndex,
      question: question.content, answer: answer.content } };
  });
}
