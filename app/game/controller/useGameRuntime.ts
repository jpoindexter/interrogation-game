import { useRouter } from 'next/navigation';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { useTTS } from '../hooks/useTTS';
import { useGameTimer } from '../hooks/useGameTimer';
import { useSfx } from '../hooks/useSfx';
import { usePatterns } from '../hooks/usePatterns';
import { useEndGame } from '../hooks/useEndGame';
import { useGameFeedback } from './useGameFeedback';
import type { useGameState } from './useGameState';
import type { useGamePanels } from './useGamePanels';
import type { GameSettings } from '../components/SettingsPanel';

export interface RuntimeOptions {
  state: ReturnType<typeof useGameState>;
  panels: ReturnType<typeof useGamePanels>;
  settings: GameSettings;
  difficulty: string;
}

export function useGameRuntime({ state, panels, settings, difficulty }: RuntimeOptions) {
  const router = useRouter();
  const sfx = useSfx();
  const feedback = useGameFeedback(panels, sfx);
  const recorder = useVoiceRecorder(state.caseData?.sessionId);
  const speech = useTTS(state.caseData?.suspect_gender, state.caseData?.sessionId, feedback.ttsErrorToast);
  const timer = useGameTimer(state.phase, difficulty, state.caseData?.timerMode, {
    startedAt: state.caseData?.startedAt, sessionId: state.caseData?.sessionId,
  });
  const storePatterns = usePatterns(state.caseData?.sessionId, state.caseData?.setting, difficulty, timer.elapsed);
  const endGame = useEndGame({
    caseData: state.caseData, conversationHistory: state.conversationHistory,
    maxStress: state.maxStress, cluesLength: state.clues.length,
    timerRef: timer.timerRef, sfx, speakResponse: speech.speakResponse,
    ttsEnabled: settings.ttsEnabled, setPhase: state.setPhase,
    setLastResponse: state.setLastResponse, setLastTranscript: state.setLastTranscript,
    setShowGiveUpConfirm: panels.setShowGiveUpConfirm, setFadingOut: panels.setFadingOut,
    storePatterns, router,
  });
  return { router, sfx, ...feedback, ...recorder, ...speech, ...timer, storePatterns, ...endGame };
}
export type GameRuntime = ReturnType<typeof useGameRuntime>;
