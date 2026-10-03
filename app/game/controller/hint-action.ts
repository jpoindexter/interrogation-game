import type { GameActionsContext } from './action-types';
import { parseHintResponse } from './action-response-validation';

export function hintAction(context: GameActionsContext) {
  return async () => {
    const { state, runtime } = context;
    if (!state.caseData || state.phase !== 'active') return false;
    runtime.sfx('click');
    try {
      const data = await context.request('/api/hint', { sessionId: state.caseData.sessionId }, value => parseHintResponse(value, state.hintsUsed));
      runtime.dismissToast();
      state.setHintsUsed(data.hintsUsed);
      state.setHintTexts(previous => [...previous, data.hint]);
      runtime.sfx('chime');
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return false;
      runtime.showToast(error instanceof Error ? error.message : 'Could not retrieve hint');
      return false;
    }
  };
}
