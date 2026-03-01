import { useRef, useState, useCallback, useEffect } from 'react';
import { getUserApiHeaders } from '../../lib/api-keys';

export function getVoiceVolume(): number {
  try { const s = localStorage.getItem('appSettings'); if (s) return JSON.parse(s).voiceVolume ?? 0.45; } catch {}
  return 0.45;
}

export function useTTS(suspectGender: string | undefined, sessionId?: string, onTTSError?: () => void) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onDoneRef = useRef<(() => void) | null>(null);
  const skippedRef = useRef(false);
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const skipSpeech = useCallback(() => {
    skippedRef.current = true;
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current = null;
    }
    speechSynthesis.cancel();
    setIsSpeaking(false);
    const cb = onDoneRef.current;
    onDoneRef.current = null;
    cb?.();
  }, []);

  const playTTS = useCallback(async (text: string, stress: number, suspectName: string | undefined, onDone: () => void) => {
    skippedRef.current = false;
    onDoneRef.current = onDone;
    const res = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json', ...getUserApiHeaders() }, body: JSON.stringify({ text, stress, suspectName, suspectGender, sessionId: sessionIdRef.current }) });
    if (!res.ok) throw new Error('TTS failed');
    if (skippedRef.current) return;
    const url = URL.createObjectURL(await res.blob());
    const audio = new Audio(url);
    audio.volume = getVoiceVolume();
    audioRef.current = audio;
    const cleanup = () => {
      if (skippedRef.current) return;
      onDoneRef.current = null;
      setIsSpeaking(false);
      URL.revokeObjectURL(url);
      audioRef.current = null;
      onDone();
    };
    audio.onended = cleanup;
    audio.onerror = cleanup;
    await audio.play();
  }, [suspectGender]);

  const speakResponse = useCallback(async (text: string, stress: number, suspectName: string | undefined, onDone: () => void, ttsEnabled: boolean) => {
    if (!ttsEnabled) { onDone(); return; }
    setIsSpeaking(true);
    try { await playTTS(text, stress, suspectName, onDone); }
    catch {
      setIsSpeaking(false);
      onTTSError?.();
      onDone();
    }
  }, [playTTS, onTTSError]);

  const speakConfession = useCallback((text: string, stress: number, suspectName: string | undefined): Promise<void> => {
    setIsSpeaking(true);
    return new Promise(async (resolve) => {
      try { await playTTS(text, stress, suspectName, resolve); }
      catch {
        setIsSpeaking(false);
        onTTSError?.();
        resolve();
      }
    });
  }, [playTTS, onTTSError]);

  useEffect(() => {
    const sync = () => {
      const vol = getVoiceVolume();
      if (audioRef.current) audioRef.current.volume = vol;
      if (vol === 0) skipSpeech();
    };
    window.addEventListener('settingsChanged', sync);
    return () => window.removeEventListener('settingsChanged', sync);
  }, [skipSpeech]);

  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      speechSynthesis.cancel();
    };
  }, []);

  return { isSpeaking, audioRef, speakResponse, speakConfession, skipSpeech };
}
