import type { RuntimeOptions, GameRuntime } from './useGameRuntime';
import { useGameRequests } from './useGameRequests';
import { questionAction } from './question-action';
import { accusationAction } from './accusation-action';
import { hintAction } from './hint-action';

interface Options extends RuntimeOptions { runtime: GameRuntime }

function recordingActions({ state, panels, runtime }: Options, sendQuestion: (text: string) => Promise<boolean>) {
  const startListening = () => {
    if (state.phase !== 'active' || runtime.isSpeaking) return;
    state.setLastTranscript('');
    void runtime.startRecording(text => { void sendQuestion(text); }, runtime.showToast, state.setLastTranscript);
  };
  const startAccusation = () => {
    if (state.phase !== 'active' || runtime.isSpeaking || state.accusationsLeft <= 0) return;
    state.setIsAccusing(true);
    void runtime.startRecording(text => {
      state.setIsAccusing(false);
      panels.setAccuseText(text);
      panels.setShowAccuseConfirm(true);
    }, message => { state.setIsAccusing(false); runtime.showToast(message); }, state.setLastTranscript);
  };
  return { startListening, startAccusation };
}

export function useGameActions(options: Options) {
  const { state, runtime } = options;
  const requests = useGameRequests(state.caseData?.sessionId);
  const context = { ...options, ...requests };
  const sendQuestion = questionAction(context);
  const submitAccusation = accusationAction(context);
  const requestHint = hintAction(context);
  const exitGame = () => {
    requests.cancelRequests();
    runtime.cancelRecording();
    runtime.cancelSpeech();
    if (runtime.timerRef.current) clearInterval(runtime.timerRef.current);
    runtime.router.push('/cases');
  };
  return { sendQuestion, submitAccusation, requestHint, exitGame, ...recordingActions(options, sendQuestion) };
}
