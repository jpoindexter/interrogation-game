import { useEffect, useEffectEvent } from 'react';
import type { RuntimeOptions, GameRuntime } from './useGameRuntime';
import type { SfxName } from '../hooks/useSfx';

interface Options extends RuntimeOptions { runtime: GameRuntime }
const neutral: SfxName[] = ['nervous_1', 'nervous_knock', 'nervous_tap', 'nervous_scratch', 'nervous_ac', 'clothes_rustle'];
const female: SfxName[] = ['nervous_heel', 'nervous_cough_f', 'female_sigh'];
const male: SfxName[] = ['nervous_foot', 'nervous_cough_m'];

export function useGameAmbience({ state, runtime }: Options) {
  const { clueNotification, setClueNotification } = state;
  const tick = useEffectEvent(() => {
    const sounds = [...neutral, ...(state.caseData?.suspect_gender.toLowerCase() === 'female' ? female : male)];
    const chance = runtime.remaining <= 60 ? 1 : runtime.remaining <= 120 ? 0.7 : 0.3;
    if (!runtime.isUnlimited && Math.random() < chance) runtime.sfx('clock_tick');
    if (state.stressLevel >= 6 && Math.random() < (state.stressLevel - 5) * 0.15) {
      runtime.sfx(sounds[Math.floor(Math.random() * sounds.length)]);
    }
  });
  useEffect(() => {
    if (state.phase !== 'active') return;
    const timer = setInterval(tick, 12000);
    return () => clearInterval(timer);
  }, [state.phase]);
  useEffect(() => {
    if (clueNotification === null) return;
    const timer = setTimeout(() => setClueNotification(null), 3000);
    return () => clearTimeout(timer);
  }, [clueNotification, setClueNotification]);
}
