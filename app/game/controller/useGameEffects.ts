import { useEffect, useEffectEvent } from 'react';
import { useGameAmbience } from './useGameAmbience';
import { useBrowserStorage } from '../../components/useBrowserStorage';
import type { RuntimeOptions, GameRuntime } from './useGameRuntime';

interface Options extends RuntimeOptions { runtime: GameRuntime }

function useMicrophoneHint({ state, panels }: Options) {
  const hintDismissed = useBrowserStorage('micHintDismissed', 'session');
  const showHint = useEffectEvent(() => panels.setShowMicHint(true));
  useEffect(() => {
    if (state.phase !== 'active' || hintDismissed) return;
    let cancelled = false;
    Promise.resolve().then(() => navigator.permissions?.query({ name: 'microphone' as PermissionName })).then(status => {
      if (!cancelled && status?.state !== 'granted') showHint();
    }).catch(() => { if (!cancelled) showHint(); });
    return () => { cancelled = true; };
  }, [state.phase, hintDismissed]);
}

export function useGameEffects(options: Options) {
  const { state, runtime } = options;
  const { onExpire } = runtime;
  const onboardingComplete = useBrowserStorage('onboardingComplete');
  const expire = useEffectEvent(() => { void runtime.handleTimeUp(); });
  const outOfAttempts = useEffectEvent(() => { void runtime.handleLose(); });
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('gamePhaseChange', { detail: state.phase }));
    return () => { window.dispatchEvent(new CustomEvent('gamePhaseChange', { detail: 'loading' })); };
  }, [state.phase]);
  useEffect(() => onExpire(() => expire()), [onExpire]);
  useEffect(() => {
    if (state.accusationsLeft <= 0 && !state.isAccusing && state.phase === 'active') outOfAttempts();
  }, [state.accusationsLeft, state.isAccusing, state.phase]);
  useMicrophoneHint(options);
  useGameAmbience(options);
  return { needsOnboarding: !onboardingComplete };
}
