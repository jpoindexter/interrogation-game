import { useRef, useState, useCallback, useEffect } from 'react';

export function useTTS(suspectGender: string | undefined, sessionId?: string) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voicesCacheRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const loadVoices = () => { voicesCacheRef.current = speechSynthesis.getVoices(); };
    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  const pickBrowserVoice = useCallback((utterance: SpeechSynthesisUtterance) => {
    const isFemale = suspectGender?.toLowerCase() === 'female';
    const voices = voicesCacheRef.current.length > 0 ? voicesCacheRef.current : speechSynthesis.getVoices();
    const enVoices = voices.filter(v => v.lang.startsWith('en'));
    if (enVoices.length === 0) return;
    const femaleNames = ['samantha', 'karen', 'victoria', 'fiona', 'moira', 'tessa', 'allison', 'ava', 'susan', 'zoe'];
    const maleNames = ['daniel', 'alex', 'tom', 'fred', 'ralph', 'lee', 'oliver', 'james', 'aaron', 'gordon'];
    const targetNames = isFemale ? femaleNames : maleNames;
    const match = enVoices.find(v => targetNames.some(n => v.name.toLowerCase().includes(n)));
    utterance.voice = match || enVoices[0];
    utterance.pitch = isFemale ? 1.15 : 0.8;
  }, [suspectGender]);

  const skipSpeech = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const speakResponse = useCallback(async (
    text: string,
    stress: number,
    suspectName: string | undefined,
    onDone: () => void,
    ttsEnabled: boolean,
  ) => {
    if (!ttsEnabled) { onDone(); return; }
    setIsSpeaking(true);

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, stress, suspectName, suspectGender, sessionId }),
      });
      if (!res.ok) throw new Error('TTS failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url); audioRef.current = null; onDone(); };
      audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(url); audioRef.current = null; onDone(); };
      await audio.play();
    } catch (err) {
      console.error('ElevenLabs TTS error, falling back to browser:', err);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      pickBrowserVoice(utterance);
      utterance.onend = () => { setIsSpeaking(false); onDone(); };
      utterance.onerror = () => { setIsSpeaking(false); onDone(); };
      speechSynthesis.speak(utterance);
    }
  }, [suspectGender, sessionId, pickBrowserVoice]);

  const speakConfession = useCallback((text: string, stress: number, suspectName: string | undefined): Promise<void> => {
    setIsSpeaking(true);
    return new Promise(async (resolve) => {
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, stress, suspectName, suspectGender, sessionId }),
        });
        if (!res.ok) throw new Error('TTS failed');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url); resolve(); };
        audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(url); resolve(); };
        await audio.play();
      } catch {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.85;
        pickBrowserVoice(utterance);
        utterance.onend = () => { setIsSpeaking(false); resolve(); };
        utterance.onerror = () => { setIsSpeaking(false); resolve(); };
        speechSynthesis.speak(utterance);
      }
    });
  }, [suspectGender, sessionId, pickBrowserVoice]);

  return { isSpeaking, setIsSpeaking, audioRef, speakResponse, speakConfession, skipSpeech };
}
