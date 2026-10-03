import { persistEnding, type CanonicalEnding } from './ending-result';
import { useCallback, useEffect, useRef } from 'react';
import type { EndGameDeps } from './endgame-types';

export function useExitCeremony(deps: EndGameDeps) {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);
  return useCallback((ending: CanonicalEnding) => {
    const { sfx, maxStress, cluesLength, storePatterns, setFadingOut, router } = deps;
    const schedule = (callback: () => void, delay: number) => { timers.current.push(setTimeout(callback, delay)); };
    const destination = persistEnding(deps, ending);
    storePatterns(ending.outcome, ending.conversationHistory, maxStress, cluesLength);
    if (ending.outcome === 'win') { router.push(destination); return; }
    sfx('standing_up');
    schedule(() => sfx('chair_slide'), 800);
    schedule(() => sfx('door'), 1800);
    schedule(() => sfx('gameover'), 2800);
    schedule(() => setFadingOut(true), 4500);
    schedule(() => router.push(destination), 5300);
  }, [deps]);
}
