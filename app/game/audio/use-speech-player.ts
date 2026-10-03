import { useCallback, useEffect, useRef, useState } from 'react';
import { browserSpeech, getVoiceVolume, voiceEnabled } from './browser-speech';
import { SpeechPlayer, type SpeechRequest } from './speech-player';

export function useSpeechPlayer(sessionKey?: string) {
  const [status, setStatus] = useState({ sessionKey, speaking: false });
  const [player] = useState(() => new SpeechPlayer(browserSpeech));
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const play = useCallback((request: SpeechRequest) => {
    setStatus({ sessionKey, speaking: true });
    return player.play({
      ...request,
      onAudio: audio => { audioRef.current = audio as HTMLAudioElement | null; request.onAudio?.(audio); },
      onDone: () => { setStatus({ sessionKey, speaking: false }); request.onDone?.(); },
    });
  }, [player, sessionKey]);
  const stop = useCallback(() => { player.stop('skipped'); setStatus({ sessionKey, speaking: false }); }, [player, sessionKey]);
  useEffect(() => {
    const sync = () => player.setVolume(voiceEnabled() ? getVoiceVolume() : 0);
    window.addEventListener('settingsChanged', sync);
    return () => { window.removeEventListener('settingsChanged', sync); player.stop('cancelled'); };
  }, [player, sessionKey]);
  const cancel = useCallback(() => player.stop('cancelled'), [player]);
  return { isSpeaking: status.sessionKey === sessionKey && status.speaking, audioRef, play, stop, cancel };
}
