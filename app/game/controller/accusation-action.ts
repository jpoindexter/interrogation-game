import type { ConversationMessage } from '@/lib/game-ai';
import type { GameActionsContext, AccusationResponse } from './action-types';
import { parseAccusationResponse } from './action-response-validation';

function saveWin(context: GameActionsContext, data: AccusationResponse, history: ConversationMessage[]) {
  const { state, runtime, difficulty } = context;
  runtime.storePatterns('win', history, state.stressLevel, state.clues.length);
  sessionStorage.setItem('gameResult', JSON.stringify({
    type: 'win', caseData: state.caseData, sessionId: state.caseData?.sessionId,
    winToken: data.winToken || '', conversationHistory: history, confession: data.confession,
    timeElapsed: runtime.elapsed, difficulty, stressLevel: state.stressLevel,
    cluesFound: state.clues.length, hintsUsed: state.hintsUsed, accusationsUsed: 3 - data.accusationsLeft,
    questionsAsked: history.filter(message => message.role === 'user'
      && !message.content.startsWith('*') && !message.content.startsWith('[ACCUSATION')).length,
  }));
}

async function finishWin(context: GameActionsContext, data: AccusationResponse, history: ConversationMessage[]) {
  const { state, runtime, settings } = context;
  if (runtime.timerRef.current) clearInterval(runtime.timerRef.current);
  runtime.sfx('win');
  state.setLastTranscript('');
  try { saveWin(context, data, history); }
  catch { runtime.showToast('Your win is saved on the server. Opening the recovery link.', 'info'); }
  if (settings.ttsEnabled) {
    const result = await runtime.speakConfession(data.confession, 10, state.caseData?.suspect_name);
    if (result === 'cancelled') return;
  }
  runtime.sfx('handcuff');
  runtime.router.push(`/game/win?session=${encodeURIComponent(state.caseData!.sessionId)}`);
}

function acceptAccusation(context: GameActionsContext, text: string, data: AccusationResponse) {
  const { state, runtime } = context;
  const history: ConversationMessage[] = [...state.conversationHistory,
    { role: 'user', kind: 'accusation', content: `[ACCUSATION] ${text}`, timestamp: runtime.elapsed },
    { role: 'assistant', content: data.confession, timestamp: runtime.elapsed },
  ];
  state.setAccusationsLeft(data.accusationsLeft);
  state.setConversationHistory(history);
  state.setLastResponse(data.confession);
  context.panels.setAccuseText('');
  return history;
}

async function rejectAccusation(context: GameActionsContext, data: AccusationResponse) {
  const { runtime, state, settings } = context;
  const exhausted = data.accusationsLeft === 0;
  runtime.sfx('wrong');
  const playback = await runtime.speakResponse({ text: data.confession, stress: state.stressLevel,
    suspectName: state.caseData!.suspect_name,
    onDone: () => { if (!exhausted) state.setPhase('active'); }, enabled: settings.ttsEnabled });
  if (exhausted && playback !== 'cancelled') await runtime.handleLose();
}

export function accusationAction(context: GameActionsContext) {
  return async (text: string): Promise<boolean> => {
    const { state, runtime } = context;
    if (!text.trim() || !state.caseData) { state.setIsAccusing(false); return false; }
    state.setLastTranscript(text);
    state.setPhase('processing');
    try {
      const data = await context.request<AccusationResponse>('/api/accuse', {
        sessionId: state.caseData.sessionId, accusation: text,
      }, value => parseAccusationResponse(value, state.accusationsLeft));
      runtime.dismissToast();
      runtime.synchronize(data.startedAt);
      const history = acceptAccusation(context, text, data);
      if (data.correct) await finishWin(context, data, history);
      else await rejectAccusation(context, data);
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return false;
      runtime.showToast(error instanceof Error ? error.message : 'The accusation could not be processed.');
      state.setPhase('active');
      context.panels.setShowAccuseConfirm(true);
      return false;
    } finally { state.setIsAccusing(false); }
  };
}
