import { useCallback, useEffect, useRef } from 'react';
import type { useGamePanels } from './useGamePanels';
import type { useSfx } from '../hooks/useSfx';

export function useGameFeedback(panels: ReturnType<typeof useGamePanels>, sfx: ReturnType<typeof useSfx>) {
  const { setToast } = panels;
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timeout.current) clearTimeout(timeout.current); }, []);
  const showToast = useCallback((message: string) => {
    sfx('error');
    setToast(message);
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setToast(null), 4000);
  }, [setToast, sfx]);
  const ttsErrorToast = useCallback(() => showToast('Voice unavailable — read the transcript to continue'), [showToast]);
  return { showToast, ttsErrorToast };
}
