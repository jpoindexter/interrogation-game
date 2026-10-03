import { acceptedTimestamp } from '../session/accepted-time';
import { LEDGER_DEMO_CASE } from './demo-case';
import { createGameplayState, recordGameplayTurn, pinStatement, bindAuthoredStatement } from './state';
import { publicGameplayState } from './projection';
import type { GameSession } from '../session/types';

export function authoredCaseData(): Record<string, unknown> {
  const graph = LEDGER_DEMO_CASE;
  return {
    case_number: 'RT-001', setting: 'trading floor', difficulty: 'easy', mode: 'redteam', requiredClues: 1,
    crime: 'A ledger disappeared from the trading office after closing.',
    objective: 'Establish one contradiction, then identify the false claim about returning to the building. Presence alone does not prove theft.',
    briefing: `${graph.briefing} This is an authored practice case with live AI dialogue.`,
    detective_leads: ['Compare the departure claim with the visitor record.', 'Check whose name appears on each record.'],
    suspect_name: 'Casey Vale', suspect_gender: 'nonbinary', suspect_role: 'Operations analyst',
    suspect_cover_story: graph.opening, suspect_true_story: graph.claims[0].truth,
    the_lie: graph.opening, the_truth: graph.claims[0].truth,
    the_contradiction: graph.contradictions[0].explanation,
    stress_triggers: ['The signed visitor record', 'The difference between presence and responsibility'],
    deflection_tactics: ['Question the accuracy of the time', 'Point to the unrelated badge record'],
    verbal_tics: 'Precise about work, evasive about times.',
  };
}

export function attachAuthoredGameplay(session: GameSession): void {
  session.gameplay = createGameplayState(session.id, LEDGER_DEMO_CASE);
}

export function gameplayProjection(session: GameSession) {
  return session.gameplay ? publicGameplayState(session.gameplay, LEDGER_DEMO_CASE) : undefined;
}

export function acceptAuthoredOpening(session: GameSession, question: string): string | null {
  if (!session.gameplay || session.conversationHistory.length || !question.startsWith('*')) return null;
  const answer = LEDGER_DEMO_CASE.opening;
  const timestamp = acceptedTimestamp(session);
  session.conversationHistory.push({ role: 'user', kind: 'question', content: question, timestamp }, { role: 'assistant', content: answer, timestamp });
  recordGameplayTurn(session.gameplay, { question, answer });
  return answer;
}

export function pinSessionStatement(session: GameSession, turnId: string, quote?: string) {
  const state = session.gameplay!;
  const statement = pinStatement(state, turnId, quote);
  // A live, unreviewed sentence remains discussable without acquiring an invented fact binding.
  const assertion = LEDGER_DEMO_CASE.claims.some(claim =>
    [claim.assertion, ...claim.alternateAssertions].includes(statement.quote));
  const turn = state.turns.find(item => item.id === turnId);
  if (assertion && statement.quote === turn?.answer) bindAuthoredStatement(state, LEDGER_DEMO_CASE, statement.id);
  return { id: statement.id, turnId: statement.turnId, quote: statement.quote,
    reviewed: Boolean(state.statements.find(item => item.id === statement.id)?.claimId) };
}
