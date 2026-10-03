import { useCallback } from 'react';
import type { ActionFeedback } from '../components/ActionNotice';
import type { useGamePanels } from './useGamePanels';
import type { useSfx } from '../hooks/useSfx';

export function useGameFeedback(panels: ReturnType<typeof useGamePanels>, sfx: ReturnType<typeof useSfx>) {
  const { setToast } = panels;
  const showToast = useCallback((message: string, tone: ActionFeedback['tone'] = 'error', recovery?: ActionFeedback['recovery']) => {
    if (tone === 'error') sfx('error');
    setToast({ message, tone, recovery });
  }, [setToast, sfx]);
  const dismissToast = useCallback(() => setToast(null), [setToast]);
  const ttsErrorToast = useCallback(() => showToast('Voice unavailable — read the transcript to continue'), [showToast]);
  return { showToast, dismissToast, ttsErrorToast };
}
