import type { AiProvenance } from '../ai/contracts';
import type { GameSession } from './types';

/** Accepted game changes, not evidence that wording caused an outcome or that stress proves a lie. */
export interface AcceptedTurnEvent {
  id: string;
  messageIndex: number;
  question: string;
  timestamp: number;
  stressBefore: number;
  stressAfter: number;
  addedClueIds: string[];
  provenance?: AiProvenance;
}
export function turnSnapshot(session: GameSession) {
  return { stress: session.currentStress, clueIds: new Set(session.clues.map(clue => clue.id)),
    messageIndex: session.conversationHistory.length };
}
export function recordTurnEvent(session: GameSession, before: ReturnType<typeof turnSnapshot>,
  input: { question: string; timestamp: number; provenance?: AiProvenance }) {
  const events = session.acceptedTurns ??= [];
  events.push({ id: `accepted-turn:${before.messageIndex}`, messageIndex: before.messageIndex,
    question: input.question, timestamp: input.timestamp, stressBefore: before.stress,
    stressAfter: session.currentStress,
    addedClueIds: session.clues.filter(clue => !before.clueIds.has(clue.id)).map(clue => clue.id),
    ...(input.provenance ? { provenance: input.provenance } : {}) });
}
