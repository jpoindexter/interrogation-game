'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

const MENU_TRACKS = ['/music/VelvetAlleyLoop.mp3', '/music/VelvetAlleyLoop2.mp3', '/music/MoonlitSavePoint4.mp3', '/music/MoonlitSavePoint5.mp3'];
const GAME_TRACKS = ['/music/MidnightSavePoint.mp3', '/music/MidnightSavePoint2.mp3', '/music/MidnightSavePoint3.mp3', '/music/MidnightSavePoint4.mp3', '/music/MidnightSavePoint6.mp3', '/music/MidnightSavePoint7.mp3', '/music/SmokeInTheSavePoint.mp3', '/music/SmokeInTheSavePoint2.mp3'];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function getVolume(): number {
  try { const s = localStorage.getItem('appSettings'); if (s) return JSON.parse(s).musicVolume ?? 0.05; } catch {}
  return 0.05;
}

function setVolumeStorage(musicVol: number, sfxVol?: number, voiceVol?: number) {
  try {
    const s = localStorage.getItem('appSettings');
    const settings = s ? JSON.parse(s) : {};
    settings.musicVolume = musicVol;
    if (sfxVol !== undefined) settings.sfxVolume = sfxVol;
    if (voiceVol !== undefined) settings.voiceVolume = voiceVol;
    localStorage.setItem('appSettings', JSON.stringify(settings));
    window.dispatchEvent(new Event('settingsChanged'));
  } catch {}
}

export function useMusicPlayer(isGame: boolean) {
  const [muted, setMuted] = useState(true);
  const [ready, setReady] = useState(false);
  const [gameActive, setGameActive] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const modeRef = useRef<'menu' | 'game'>('menu');
  const playlistRef = useRef<string[]>([]);
  const indexRef = useRef(0);
  const prevVolumeRef = useRef(0.05);
  const prevSfxRef = useRef(0.5);
  const prevVoiceRef = useRef(0.7);
  const fadingRef = useRef(false);
  const fadeTimersRef = useRef<number[]>([]);
  const incomingRef = useRef<HTMLAudioElement | null>(null);

  const desiredMode = isGame && gameActive ? 'game' : 'menu';

  useEffect(() => {
    const vol = getVolume();
    if (vol > 0) prevVolumeRef.current = vol;
    try { const s = localStorage.getItem('appSettings'); if (s) { const p = JSON.parse(s); if (p.sfxVolume > 0) prevSfxRef.current = p.sfxVolume; if (p.voiceVolume > 0) prevVoiceRef.current = p.voiceVolume; } } catch {}
    setMuted(vol === 0);
    setReady(true);
  }, []);

  useEffect(() => {
    const handler = () => {
      const vol = getVolume();
      setMuted(vol === 0);
      if (vol > 0) { prevVolumeRef.current = vol; if (audioRef.current && !fadingRef.current) audioRef.current.volume = vol; }
      else {
        fadeTimersRef.current.forEach(clearInterval); fadeTimersRef.current = []; fadingRef.current = false;
        if (incomingRef.current) { incomingRef.current.pause(); incomingRef.current.src = ''; incomingRef.current = null; }
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; audioRef.current = null; }
      }
    };
    window.addEventListener('settingsChanged', handler);
    return () => window.removeEventListener('settingsChanged', handler);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => setGameActive((e as CustomEvent).detail === 'active' || (e as CustomEvent).detail === 'processing');
    window.addEventListener('gamePhaseChange', handler);
    return () => window.removeEventListener('gamePhaseChange', handler);
  }, []);

  useEffect(() => { if (!isGame) setGameActive(false); }, [isGame]);

  const getNextTrack = useCallback((pool: string[]) => {
    if (playlistRef.current.length === 0 || indexRef.current >= playlistRef.current.length) { playlistRef.current = shuffle(pool); indexRef.current = 0; }
    return playlistRef.current[indexRef.current++];
  }, []);

  const fadeAudioIn = useCallback((audio: HTMLAudioElement, targetVol: number) => {
    audio.volume = 0; let step = 0; const steps = 20;
    const timer = setInterval(() => { step++; audio.volume = Math.min(targetVol, targetVol * (step / steps)); if (step >= steps) clearInterval(timer); }, 1500 / steps);
  }, []);

  const fadeAudioOut = useCallback((audio: HTMLAudioElement, cb?: () => void) => {
    const startVol = audio.volume; let step = 0; const steps = 15;
    const timer = setInterval(() => { step++; audio.volume = Math.max(0, startVol * (1 - step / steps)); if (step >= steps) { clearInterval(timer); audio.pause(); audio.src = ''; cb?.(); } }, 750 / steps);
  }, []);

  const crossfadeTo = useCallback((nextSrc: string) => {
    fadeTimersRef.current.forEach(clearInterval); fadeTimersRef.current = [];
    if (incomingRef.current) { incomingRef.current.pause(); incomingRef.current.src = ''; incomingRef.current = null; }
    if (fadingRef.current && audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
    fadingRef.current = true;
    const outgoing = audioRef.current;
    const vol = getVolume();
    const steps = 20;
    let step = 0;
    const outTimer = setInterval(() => {
      step++;
      if (outgoing) outgoing.volume = Math.max(0, vol * (1 - step / steps));
      if (step >= steps) {
        clearInterval(outTimer);
        if (outgoing) { outgoing.pause(); outgoing.src = ''; }
        const incoming = new Audio(nextSrc); incomingRef.current = incoming; incoming.volume = 0; incoming.play().catch(() => {});
        let inStep = 0;
        const inTimer = setInterval(() => { inStep++; incoming.volume = Math.min(vol, vol * (inStep / steps)); if (inStep >= steps) { clearInterval(inTimer); audioRef.current = incoming; incomingRef.current = null; fadingRef.current = false; } }, 2000 / steps) as unknown as number;
        fadeTimersRef.current.push(inTimer);
      }
    }, 2000 / steps) as unknown as number;
    fadeTimersRef.current.push(outTimer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (muted) {
      fadeTimersRef.current.forEach(clearInterval); fadeTimersRef.current = []; fadingRef.current = false;
      if (incomingRef.current) { incomingRef.current.pause(); incomingRef.current.src = ''; incomingRef.current = null; }
      if (audioRef.current) { fadeAudioOut(audioRef.current); audioRef.current = null; }
      modeRef.current = desiredMode; return;
    }
    const pool = desiredMode === 'game' ? GAME_TRACKS : MENU_TRACKS;
    if (modeRef.current !== desiredMode && audioRef.current) { modeRef.current = desiredMode; playlistRef.current = []; indexRef.current = 0; crossfadeTo(getNextTrack(pool)); return; }
    modeRef.current = desiredMode;
    if (!audioRef.current && !fadingRef.current) {
      playlistRef.current = []; indexRef.current = 0;
      const audio = new Audio(getNextTrack(pool)); audio.preload = 'auto'; audio.volume = 0; audioRef.current = audio;
      const vol = getVolume(); let started = false;
      const startWithFade = () => { if (started) return; started = true; audio.play().then(() => fadeAudioIn(audio, vol)).catch(() => { started = false; }); };
      startWithFade();
      const events = ['click', 'keydown', 'touchstart', 'pointerdown'];
      const handler = () => { started = false; startWithFade(); events.forEach(e => document.removeEventListener(e, handler)); };
      events.forEach(e => document.addEventListener(e, handler, { once: true }));
      return () => { events.forEach(e => document.removeEventListener(e, handler)); if (audioRef.current === audio) { audio.pause(); audio.src = ''; audioRef.current = null; } };
    }
  }, [ready, muted, desiredMode, getNextTrack, crossfadeTo, fadeAudioIn, fadeAudioOut]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || muted) return;
    const onEnded = () => {
      if (fadingRef.current) return;
      const pool = modeRef.current === 'game' ? GAME_TRACKS : MENU_TRACKS;
      const next = new Audio(getNextTrack(pool)); const vol = getVolume(); next.volume = 0; next.play().catch(() => {}); audioRef.current = next;
      let step = 0; const steps = 15;
      const timer = setInterval(() => { step++; next.volume = Math.min(vol, vol * (step / steps)); if (step >= steps) clearInterval(timer); }, 1500 / steps);
    };
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  });

  const toggle = useCallback(() => {
    if (muted) {
      setVolumeStorage(prevVolumeRef.current || 0.05, prevSfxRef.current || 0.5, prevVoiceRef.current || 0.7);
      setMuted(false);
    } else {
      prevVolumeRef.current = getVolume() || 0.05;
      try { const s = localStorage.getItem('appSettings'); if (s) { const p = JSON.parse(s); if (p.sfxVolume > 0) prevSfxRef.current = p.sfxVolume; if (p.voiceVolume > 0) prevVoiceRef.current = p.voiceVolume; } } catch {}
      setVolumeStorage(0, 0, 0); setMuted(true);
    }
  }, [muted]);

  return { muted, ready, gameActive, toggle };
}
