import { useCallback } from 'react';
import { getVoiceVolume, voiceEnabled } from '../audio/browser-speech';
import { useSpeechPlayer } from '../audio/use-speech-player';
export { getVoiceVolume } from '../audio/browser-speech';

export interface SpeakResponseOptions {
  text: string;
  stress: number;
  suspectName?: string;
  onDone: () => void;
  enabled: boolean;
}

export function useTTS(suspectGender: string | undefined, sessionId?: string, onTTSError?: () => void) {
  const { isSpeaking, audioRef, play, stop, cancel } = useSpeechPlayer(sessionId);
  const speakResponse = useCallback(({ text, stress, suspectName, onDone, enabled }: SpeakResponseOptions) => play({
    body: { text, stress, suspectName, suspectGender, sessionId },
    volume: getVoiceVolume(), enabled: enabled && voiceEnabled(), onDone, onError: onTTSError,
  }), [play, suspectGender, sessionId, onTTSError]);
  const speakConfession = useCallback((text: string, stress: number, suspectName: string | undefined) => play({
    body: { text, stress, suspectName, suspectGender, sessionId },
    volume: getVoiceVolume(), enabled: voiceEnabled(), onError: onTTSError,
  }), [play, suspectGender, sessionId, onTTSError]);
  return { isSpeaking, audioRef, speakResponse, speakConfession, skipSpeech: stop, cancelSpeech: cancel };
}
