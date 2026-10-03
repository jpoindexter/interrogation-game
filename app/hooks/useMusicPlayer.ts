'use client';
import { useState, useEffect, useRef } from 'react';
import { usePreferences } from '../settings/usePreferences';
import { savePreferences } from '../settings/preferences-store';
import { MusicEngine } from './music-engine';

const subscribeReady = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
import { useSyncExternalStore } from 'react';

export function useMusicPlayer(isGame: boolean) {
  const { musicVolume } = usePreferences();
  const muted = musicVolume === 0;
  const ready = useSyncExternalStore(subscribeReady, clientReady, serverReady);
  const [active, setActive] = useState(false);
  const gameActive = isGame && active;
  const engine = useRef<MusicEngine | null>(null);
  const previous = useRef(0.1);
  useEffect(() => {
    const player = new MusicEngine(src => new Audio(src));
    engine.current = player;
    const resume = () => player.resume();
    const phase = (event: Event) => setActive(['active', 'processing'].includes((event as CustomEvent).detail));
    document.addEventListener('pointerdown', resume);
    document.addEventListener('keydown', resume);
    window.addEventListener('gamePhaseChange', phase);
    return () => {
      player.dispose();
      document.removeEventListener('pointerdown', resume);
      document.removeEventListener('keydown', resume);
      window.removeEventListener('gamePhaseChange', phase);
    };
  }, []);
  useEffect(() => {
    if (musicVolume > 0) previous.current = musicVolume;
    engine.current?.configure(gameActive ? 'game' : 'menu', musicVolume);
  }, [gameActive, musicVolume]);
  const toggle = () => { savePreferences({ musicVolume: muted ? previous.current : 0 }); };

  return { muted, ready, gameActive, toggle };
}
