import { useState, useEffect, useCallback } from 'react';
import { getVoiceVolume, voiceEnabled } from '../audio/browser-speech';
import { followSpeech } from '../audio/briefing-progress';
import { useSpeechPlayer } from '../audio/use-speech-player';

export function useBriefingTTS(active: boolean, fullText: string,
  caseData: { suspect_name: string; suspect_gender: string; sessionId?: string }) {
  const [charIndex, setCharIndex] = useState(0);
  const { play, stop, cancel, isSpeaking } = useSpeechPlayer(caseData.sessionId);
  const { suspect_name: suspectName, suspect_gender: suspectGender, sessionId } = caseData;
  useEffect(() => {
    if (!active) return;
    let disposed = false;
    let stopProgress = () => {};
    void Promise.resolve().then(() => {
      if (disposed) return;
      setCharIndex(0);
      return play({
        body: { text: fullText, stress: 0, suspectName, suspectGender, sessionId, role: 'detective' },
        volume: getVoiceVolume(), enabled: voiceEnabled(),
        onAudio: audio => {
          stopProgress();
          if (audio) stopProgress = followSpeech(audio, fullText.length, setCharIndex);
        },
        onDone: () => { if (!disposed) setCharIndex(fullText.length); },
      });
    });
    return () => { disposed = true; stopProgress(); cancel(); };
  }, [active, fullText, suspectName, suspectGender, sessionId, play, cancel]);
  const skip = useCallback(() => { stop(); setCharIndex(fullText.length); }, [stop, fullText.length]);
  return { charIndex, isPlaying: active && isSpeaking, skip, stop };
}
