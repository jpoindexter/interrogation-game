import { useGameplayWorkbench, type GameplayUpdate } from './useGameplayWorkbench';
import type { RuntimeOptions, GameRuntime } from './useGameRuntime';

interface Options extends RuntimeOptions { runtime: GameRuntime }

function acceptEvidenceUpdate({ state, runtime, settings }: Options, update: GameplayUpdate) {
  const knownTurns = new Set(state.gameplay?.turns.map(turn => turn.id));
  state.setGameplay(update.gameplay);
  if (!('result' in update)) return;
  const added = update.gameplay.turns.filter(turn => !knownTurns.has(turn.id));
  state.setConversationHistory(previous => [...previous, ...added.flatMap(turn => [
    { role: 'user' as const, content: turn.question }, { role: 'assistant' as const, content: turn.answer },
  ])]);
  state.setClues(update.clues.map(clue => clue.text));
  state.setStressLevel(update.stressLevel);
  state.setMaxStress(previous => Math.max(previous, update.stressLevel));
  state.setLastResponse(update.response);
  runtime.synchronize(update.startedAt);
  if (update.result.progressAdded) runtime.sfx('papershuffle');
  state.setPhase('processing');
  void runtime.speakResponse({ text: update.response, stress: update.stressLevel,
    suspectName: state.caseData?.suspect_name ?? '', enabled: settings.ttsEnabled,
    onDone: () => state.setPhase('active') });
}

export function useEvidenceGameplay(options: Options) {
  return useGameplayWorkbench({ sessionId: options.state.caseData?.sessionId ?? null,
    projection: options.state.gameplay, onUpdate: update => acceptEvidenceUpdate(options, update),
    disabled: options.state.phase !== 'active' || options.runtime.isSpeaking || options.runtime.isListening,
  });
}
