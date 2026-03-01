import { useRef, useState, useCallback, useEffect } from 'react';

export function useTTS(suspectGender: string | undefined, sessionId?: string) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

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
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const playTTS = useCallback(async (text: string, stress: number, suspectName: string | undefined, onDone: () => void) => {
    const res = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, stress, suspectName, suspectGender, sessionId }) });
    if (!res.ok) throw new Error('TTS failed');
    const url = URL.createObjectURL(await res.blob());
    const audio = new Audio(url);
    audioRef.current = audio;
    const cleanup = () => { setIsSpeaking(false); URL.revokeObjectURL(url); audioRef.current = null; onDone(); };
    audio.onended = cleanup;
    audio.onerror = cleanup;
    await audio.play();
  }, [suspectGender, sessionId]);

  const fallbackTTS = useCallback((text: string, rate: number, onDone: () => void) => {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    pickVoice(u);
    u.onend = () => { setIsSpeaking(false); onDone(); };
    u.onerror = () => { setIsSpeaking(false); onDone(); };
    speechSynthesis.speak(u);
  }, [pickVoice]);

  const speakResponse = useCallback(async (text: string, stress: number, suspectName: string | undefined, onDone: () => void, ttsEnabled: boolean) => {
    if (!ttsEnabled) { onDone(); return; }
    setIsSpeaking(true);
    try { await playTTS(text, stress, suspectName, onDone); }
    catch { fallbackTTS(text, 0.9, onDone); }
  }, [playTTS, fallbackTTS]);

  const speakConfession = useCallback((text: string, stress: number, suspectName: string | undefined): Promise<void> => {
    setIsSpeaking(true);
    return new Promise(async (resolve) => {
      try { await playTTS(text, stress, suspectName, resolve); }
      catch { fallbackTTS(text, 0.85, resolve); }
    });
  }, [playTTS, fallbackTTS]);

  // Stop all audio on unmount (e.g. user navigates away)
  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      speechSynthesis.cancel();
    };
  }, []);

  return { isSpeaking, setIsSpeaking, audioRef, speakResponse, speakConfession, skipSpeech };
}
