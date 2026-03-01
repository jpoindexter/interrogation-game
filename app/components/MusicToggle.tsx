'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';

const MENU_TRACKS = [
  '/music/VelvetAlleyLoop.mp3',
  '/music/VelvetAlleyLoop2.mp3',
  '/music/MoonlitSavePoint4.mp3',
  '/music/MoonlitSavePoint5.mp3',
];

const GAME_TRACKS = [
  '/music/MidnightSavePoint.mp3',
  '/music/MidnightSavePoint2.mp3',
  '/music/MidnightSavePoint3.mp3',
  '/music/MidnightSavePoint4.mp3',
  '/music/MidnightSavePoint6.mp3',
  '/music/MidnightSavePoint7.mp3',
  '/music/SmokeInTheSavePoint.mp3',
  '/music/SmokeInTheSavePoint2.mp3',
];

const FADE_MS = 2500;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getVolume(): number {
  try {
    const s = localStorage.getItem('appSettings');
    if (s) return JSON.parse(s).musicVolume ?? 0.05;
  } catch {}
  return 0.05;
}

function setVolumeStorage(v: number) {
  try {
    const s = localStorage.getItem('appSettings');
    const settings = s ? JSON.parse(s) : {};
    settings.musicVolume = v;
    localStorage.setItem('appSettings', JSON.stringify(settings));
    window.dispatchEvent(new Event('settingsChanged'));
  } catch {}
}

export default function MusicToggle() {
  const pathname = usePathname();
  const isGame = pathname.startsWith('/game');

  const [muted, setMuted] = useState(true);
  const [ready, setReady] = useState(false);
  const [gameActive, setGameActive] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const modeRef = useRef<'menu' | 'game'>('menu');
  const playlistRef = useRef<string[]>([]);
  const indexRef = useRef(0);
  const prevVolumeRef = useRef(0.05);
  const fadingRef = useRef(false);

  // Determine desired mode
  const desiredMode = isGame && gameActive ? 'game' : 'menu';

  // Hydrate from localStorage after mount
  useEffect(() => {
    const vol = getVolume();
    if (vol > 0) prevVolumeRef.current = vol;
    setMuted(vol === 0);
    setReady(true);
  }, []);

  // Listen for settings changes
  useEffect(() => {
    const handler = () => {
      const vol = getVolume();
      setMuted(vol === 0);
      if (vol > 0) prevVolumeRef.current = vol;
      if (audioRef.current && !fadingRef.current) audioRef.current.volume = vol;
    };
    window.addEventListener('settingsChanged', handler);
    return () => window.removeEventListener('settingsChanged', handler);
  }, []);

  // Listen for game phase changes
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setGameActive(detail === 'active' || detail === 'processing');
    };
    window.addEventListener('gamePhaseChange', handler);
    return () => window.removeEventListener('gamePhaseChange', handler);
  }, []);

  // Reset gameActive when leaving game pages
  useEffect(() => {
    if (!isGame) setGameActive(false);
  }, [isGame]);

  const getNextTrack = useCallback((pool: string[]) => {
    if (playlistRef.current.length === 0 || indexRef.current >= playlistRef.current.length) {
      playlistRef.current = shuffle(pool);
      indexRef.current = 0;
    }
    return playlistRef.current[indexRef.current++];
  }, []);

  const crossfadeTo = useCallback((nextSrc: string) => {
    if (fadingRef.current) {
      // Kill current audio immediately and start fresh
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
    }
    fadingRef.current = true;
    const outgoing = audioRef.current;
    const incoming = new Audio(nextSrc);
    const vol = getVolume();
    incoming.volume = 0;
    incoming.play().catch(() => {});
    let step = 0;
    const steps = 25;
    const timer = setInterval(() => {
      step++;
      const p = step / steps;
      if (outgoing) outgoing.volume = Math.max(0, vol * (1 - p));
      incoming.volume = vol * p;
      if (step >= steps) {
        clearInterval(timer);
        if (outgoing) { outgoing.pause(); outgoing.src = ''; }
        audioRef.current = incoming;
        fadingRef.current = false;
      }
    }, FADE_MS / steps);
  }, []);

  const fadeIn = useCallback((audio: HTMLAudioElement, targetVol: number) => {
    audio.volume = 0;
    let step = 0;
    const steps = 20;
    const timer = setInterval(() => {
      step++;
      audio.volume = Math.min(targetVol, targetVol * (step / steps));
      if (step >= steps) clearInterval(timer);
    }, 1500 / steps);
  }, []);

  const fadeOut = useCallback((audio: HTMLAudioElement, cb?: () => void) => {
    const startVol = audio.volume;
    let step = 0;
    const steps = 15;
    const timer = setInterval(() => {
      step++;
      audio.volume = Math.max(0, startVol * (1 - step / steps));
      if (step >= steps) { clearInterval(timer); audio.pause(); audio.src = ''; cb?.(); }
    }, 750 / steps);
  }, []);

  // Start or switch music based on mode
  useEffect(() => {
    if (!ready) return;
    if (muted) {
      if (audioRef.current) { fadeOut(audioRef.current); audioRef.current = null; }
      modeRef.current = desiredMode;
      return;
    }

    const pool = desiredMode === 'game' ? GAME_TRACKS : MENU_TRACKS;

    // If mode changed, crossfade to new pool
    if (modeRef.current !== desiredMode && audioRef.current) {
      modeRef.current = desiredMode;
      playlistRef.current = [];
      indexRef.current = 0;
      crossfadeTo(getNextTrack(pool));
      return;
    }

    modeRef.current = desiredMode;

    // If no audio playing, start fresh with fade-in
    if (!audioRef.current) {
      playlistRef.current = [];
      indexRef.current = 0;
      const src = getNextTrack(pool);
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.volume = 0;
      audioRef.current = audio;
      const vol = getVolume();

      const startWithFade = () => {
        audio.play().then(() => fadeIn(audio, vol)).catch(() => {});
      };
      startWithFade();

      // Listen for any user interaction to unlock autoplay
      const events = ['click', 'keydown', 'touchstart', 'pointerdown'];
      const handler = () => {
        startWithFade();
        events.forEach(e => document.removeEventListener(e, handler));
      };
      events.forEach(e => document.addEventListener(e, handler, { once: true }));

      return () => {
        events.forEach(e => document.removeEventListener(e, handler));
        if (audioRef.current === audio) {
          audio.pause();
          audio.src = '';
          audioRef.current = null;
        }
      };
    }
  }, [ready, muted, desiredMode, getNextTrack, crossfadeTo, fadeIn, fadeOut]);

  // Handle track ending — play next from current pool
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || muted) return;
    const onEnded = () => {
      const pool = modeRef.current === 'game' ? GAME_TRACKS : MENU_TRACKS;
      crossfadeTo(getNextTrack(pool));
    };
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  });

  const toggle = () => {
    try { const a = new Audio('/efx/click.wav'); a.volume = 0.25; a.play().catch(() => {}); } catch {}
    if (muted) {
      const vol = prevVolumeRef.current || 0.05;
      setVolumeStorage(vol);
      setMuted(false);
    } else {
      prevVolumeRef.current = getVolume() || 0.05;
      setVolumeStorage(0);
      setMuted(true);
    }
  };

  // Hide before hydration (avoids mismatch) and on game pages
  if (!ready || isGame) return null;

  return (
    <button
      onClick={toggle}
      className="fixed bottom-4 right-4 z-50 w-10 h-10 flex items-center justify-center bg-surface-darker/80 hover:bg-surface-dark border border-surface rounded-full transition-colors backdrop-blur-sm"
      title={muted ? 'Play music' : 'Mute music'}
    >
      {muted ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground">
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      )}
    </button>
  );
}
