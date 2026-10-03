import { interrogate } from '../game-ai';
import { requireActive, acceptClue } from '../session/transitions';
import { commitTurn, sessionProjection } from '../session/turn';
import type { GameSession } from '../session/types';
import { LEDGER_DEMO_CASE } from './demo-case';
import { gameplayProjection, pinSessionStatement } from './session';
import { prepareDialogueAction, commitDialogueAction, cancelDialogueAction } from './challenges';
import { requireCondition } from './errors';

function responseEnvelope(session: GameSession, result: unknown, response: string) {
  return { result, response, stressLevel: session.currentStress, ...sessionProjection(session) };
}

export async function playDialogue(session: GameSession, input: unknown, signal?: AbortSignal) {
  requireActive(session);
  requireCondition(session.gameplay, 'UNAVAILABLE_MODE', 'This case has no authored evidence workbench.');
  const prepared = prepareDialogueAction(session.gameplay, LEDGER_DEMO_CASE, input);
  if (prepared.kind === 'replay') return responseEnvelope(session, prepared.result, prepared.result.answer);
  requireCondition(prepared.kind === 'ready', 'ACTION_BUSY', 'Another dialogue action is in progress.');
  const { action, attempt, sourceQuote, exhibitText } = prepared;
  try {
    const question = [action.question, `Recorded statement: ${sourceQuote}`,
      exhibitText ? `Presented case exhibit: ${exhibitText}` : ''].filter(Boolean).join('\n');
    const raw = await interrogate(session.caseData as Parameters<typeof interrogate>[0],
      session.conversationHistory, question, session.questionsAsked, session.currentStress, session.learnedTactics, { signal });
    signal?.throwIfAborted();
    const accepted = commitTurn(session, action.question, raw, { recordGameplay: false });
    requireCondition(!session.outcome, 'SESSION_ENDED', 'The interrogation ended before the response arrived.');
    const result = commitDialogueAction(session.gameplay, LEDGER_DEMO_CASE,
      { actionId: action.id, attempt, answer: accepted.spoken_response });
    if (result.progressAdded) acceptClue(session, result.explanation);
    return responseEnvelope(session, result, result.answer);
  } catch (error) {
    cancelDialogueAction(session.gameplay, action.id, attempt);
    throw error;
  }
}

export function pinDialogue(session: GameSession, body: Record<string, unknown>) {
  requireActive(session);
  requireCondition(session.gameplay, 'UNAVAILABLE_MODE', 'This case has no authored evidence workbench.');
  requireCondition(typeof body.turnId === 'string' && body.turnId.length <= 120, 'INVALID_SOURCE', 'Select a recorded turn.');
  requireCondition(body.quote === undefined || typeof body.quote === 'string', 'INVALID_QUOTE', 'Select an exact quote.');
  const statement = pinSessionStatement(session, body.turnId, body.quote as string | undefined);
  return { statement, gameplay: gameplayProjection(session) };
}
