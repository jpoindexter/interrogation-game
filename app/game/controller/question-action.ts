import type { GameActionsContext, TurnResponse } from './action-types';
import { parseTurnResponse } from './action-response-validation';

function acceptTurn(context: GameActionsContext, question: string, data: TurnResponse) {
  const { state, runtime } = context;
  state.setConversationHistory(previous => [...previous,
    { role: 'user', content: question, timestamp: runtime.elapsed },
    { role: 'assistant', content: data.spoken_response, timestamp: runtime.elapsed },
  ]);
  state.setLastResponse(data.spoken_response);
  if (data.gameplay) state.setGameplay(data.gameplay);
  const stress = data.stress_level;
  state.setStressLevel(stress);
  state.setMaxStress(previous => Math.max(previous, stress));
  if (stress > state.stressLevel + 1) runtime.sfx('tension');
  const clues = data.clues.map(clue => clue.text);
  if (clues.length > state.clues.length) runtime.sfx('papershuffle');
  state.setClues(clues);
  state.setClueRecords(data.clues);
  state.setClueNotification(clues.length > state.clues.length ? clues.length : null);
}

function applyTurnTiming(context: GameActionsContext, data: TurnResponse) {
  const { runtime, state } = context;
  runtime.synchronize(data.startedAt);
  if (data.timeExpired || data.outcome === 'lose_time') { void runtime.handleTimeUp(); return true; }
  if (data.outcome && data.outcome !== 'lose_lawyer') {
    const destination = data.outcome === 'win' ? 'win' : 'lose';
    runtime.router.push(`/game/${destination}?session=${encodeURIComponent(state.caseData!.sessionId)}`);
    return true;
  }
  return false;
}

function recoverQuestion(context: GameActionsContext, error: unknown) {
  if (error instanceof DOMException && error.name === 'AbortError') return false;
  context.runtime.showToast(error instanceof Error ? error.message : 'Could not reach the suspect.');
  context.state.setPhase('active');
  return false;
}

export function questionAction(context: GameActionsContext) {
  return async (question: string, isOpening = false): Promise<boolean> => {
    const { state, runtime, settings } = context;
    if (!state.caseData || (!isOpening && state.phase !== 'active')) return false;
    state.setPhase('processing');
    state.setLastTranscript(question);
    try {
      const data = await context.request<TurnResponse>('/api/interrogate', {
        sessionId: state.caseData.sessionId, playerQuestion: question,
      }, parseTurnResponse);
      if (applyTurnTiming(context, data)) return true;
      acceptTurn(context, question, data);
      if (data.lawyered_up || data.outcome === 'lose_lawyer') { void runtime.handleLawyerUp(); return true; }
      await runtime.speakResponse({ text: data.spoken_response, stress: data.stress_level,
        suspectName: state.caseData.suspect_name, onDone: () => state.setPhase('active'), enabled: settings.ttsEnabled });
      return true;
    } catch (error) {
      return recoverQuestion(context, error);
    }
  };
}
