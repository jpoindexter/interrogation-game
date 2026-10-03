import { useEvidenceGameplay } from './useEvidenceGameplay';
import { useSearchParams } from 'next/navigation';
import { DIFFICULTY_CLUES } from '@/lib/game-state';
import { useSettings } from '../hooks/useSettings';
import { useCaseLoader } from '../hooks/useCaseLoader';
import { useGameState } from './useGameState';
import { useGamePanels } from './useGamePanels';
import { useGameRuntime } from './useGameRuntime';
import { useGameEffects } from './useGameEffects';
import { useGameActions } from './useGameActions';
import { acceptLoadedCase } from './restore-game';
import { useMasterMute } from './useMasterMute';

export function useGameController() {
  const params = useSearchParams();
  const selectedDifficulty = params.get('difficulty') || 'medium';
  const { settings, updateSettings } = useSettings();
  const state = useGameState();
  const difficulty = state.caseData?.difficulty || selectedDifficulty;
  const cluesNeeded = state.caseData?.requiredClues || DIFFICULTY_CLUES[difficulty] || 3;
  const panels = useGamePanels();
  const options = { state, panels, settings, difficulty };
  const runtime = useGameRuntime(options);
  const effects = useGameEffects({ ...options, runtime });
  const actions = useGameActions({ ...options, runtime });
  const evidenceGameplay = useEvidenceGameplay({ ...options, runtime });
  const toggleMasterMute = useMasterMute(settings, updateSettings);
  const caseLoader = useCaseLoader({ difficulty: selectedDifficulty, setting: params.get('setting'),
    mode: params.get('mode'), sessionId: params.get('session'), onLoaded: (data, snapshot) => acceptLoadedCase({
      ...options, runtime, query: params.toString(), needsOnboarding: effects.needsOnboarding,
    }, data, snapshot),
  });
  return {
    ...state, ...panels, ...runtime, ...actions, settings, updateSettings,
    difficulty, cluesNeeded, caseLoader, toggleMasterMute, evidenceGameplay,
    phase: evidenceGameplay.pending ? 'processing' as const : state.phase,
  };
}
export type GameController = ReturnType<typeof useGameController>;
