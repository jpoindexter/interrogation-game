import { useState, useCallback, useEffect, useMemo, type SetStateAction } from 'react';
import { browserRecorder } from '../audio/browser-recorder';
import { RecorderSession, type RecordingRecovery } from '../audio/recorder-session';

export function useVoiceRecorder(sessionId?: string) {
  const [status, setStatus] = useState({ sessionId, listening: false, recovery: null as RecordingRecovery | null });
  const setIsListening = useCallback((value: SetStateAction<boolean>) => setStatus(previous => ({
    ...previous, sessionId, listening: typeof value === 'function' ? value(previous.sessionId === sessionId && previous.listening) : value,
  })), [sessionId]);
  const onRecovery = useCallback((recovery: RecordingRecovery | null) => setStatus(previous => ({
    ...previous, sessionId, recovery,
  })), [sessionId]);
  const recorder = useMemo(() => new RecorderSession({
    ...browserRecorder(sessionId), onListening: setIsListening, onRecovery,
  }), [sessionId, setIsListening, onRecovery]);
  useEffect(() => () => recorder.cancel(true), [recorder]);
  const startRecording = useCallback((onTranscript: (text: string) => void,
    onError: (message: string) => void, setLastTranscript?: (text: string) => void) =>
    recorder.start({ onTranscript, onError, onStatus: setLastTranscript }), [recorder]);
  const stopListening = useCallback(() => recorder.stop(), [recorder]);
  const cancelRecording = useCallback(() => recorder.cancel(), [recorder]);
  const retryTranscription = useCallback(() => recorder.retry(), [recorder]);
  return { recordingRecovery: status.sessionId === sessionId ? status.recovery : null, retryTranscription,
    isListening: status.sessionId === sessionId && status.listening, setIsListening, startRecording, stopListening, cancelRecording };
}
