import { useRef, useState, useCallback, useEffect } from 'react';

function getVoiceVolume(): number {
  try { const s = localStorage.getItem('appSettings'); if (s) return JSON.parse(s).voiceVolume ?? 0.7; } catch {}
  return 0.7;
}

export function useTTS(suspectGender: string | undefined, sessionId?: string, onTTSError?: () => void) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const onDoneRef = useRef<(() => void) | null>(null);
  const skippedRef = useRef(false);
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  useEffect(() => {
    const load = () => { voicesRef.current = speechSynthesis.getVoices(); };
    load();
    speechSynthesis.addEventListener('voiceschanged', load);
    return () => speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  const pickVoice = useCallback((u: SpeechSynthesisUtterance) => {
    const isFemale = suspectGender?.toLowerCase() === 'female';
    const voices = (voicesRef.current.length > 0 ? voicesRef.current : speechSynthesis.getVoices()).filter(v => v.lang.startsWith('en'));
    if (!voices.length) return;
    const names = isFemale ? ['samantha', 'karen', 'victoria', 'fiona', 'moira', 'tessa', 'allison', 'ava'] : ['daniel', 'alex', 'tom', 'fred', 'ralph', 'lee', 'oliver', 'james'];
    u.voice = voices.find(v => names.some(n => v.name.toLowerCase().includes(n))) || voices[0];
    u.pitch = isFemale ? 1.15 : 0.8;
  }, [suspectGender]);

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
    const res = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, stress, suspectName, suspectGender, sessionId: sessionIdRef.current }) });
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

  // Stop all audio on unmount (e.g. user navigates away)
  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      speechSynthesis.cancel();
    };
  }, []);

  return { isSpeaking, setIsSpeaking, audioRef, speakResponse, speakConfession, skipSpeech };
}
