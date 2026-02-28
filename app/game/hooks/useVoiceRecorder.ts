import { useRef, useState, useCallback } from 'react';

export function useVoiceRecorder() {
  const [isListening, setIsListening] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<number>(0);
  const rafSilenceRef = useRef<number>(0);

  const transcribeAudio = async (blob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');
    const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return (data.text ?? '').trim();
  };

  const stopListening = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
    cancelAnimationFrame(rafSilenceRef.current);
    setIsListening(false);
  }, []);

  const startSilenceDetection = useCallback((stream: MediaStream) => {
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    analyserRef.current = analyser;
    silenceTimerRef.current = 0;

    const data = new Uint8Array(analyser.frequencyBinCount);
    let lastTime = performance.now();

    const check = () => {
      analyser.getByteFrequencyData(data);
      const rms = Math.sqrt(data.reduce((sum, v) => sum + v * v, 0) / data.length);
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (rms < 15) {
        silenceTimerRef.current += dt;
        if (silenceTimerRef.current >= 2) {
          stopListening();
          audioCtx.close();
          return;
        }
      } else {
        silenceTimerRef.current = 0;
      }
      rafSilenceRef.current = requestAnimationFrame(check);
    };
    rafSilenceRef.current = requestAnimationFrame(check);
    return audioCtx;
  }, [stopListening]);

  const startRecording = useCallback(async (
    onTranscript: (transcript: string) => void,
    onError: (msg: string) => void,
    setLastTranscript?: (t: string) => void,
  ) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        cancelAnimationFrame(rafSilenceRef.current);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size < 2000) {
          onError('(no speech detected — try again)');
          return;
        }

        try {
          setLastTranscript?.('(transcribing...)');
          const transcript = await transcribeAudio(blob);
          if (transcript) {
            onTranscript(transcript);
          } else {
            onError('(no speech detected — try again)');
          }
        } catch (err) {
          console.error('Transcription failed:', err);
          onError('(transcription failed — try again or type below)');
        }
      };

      recorder.start(250);
      setIsListening(true);
      startSilenceDetection(stream);
    } catch (err) {
      console.error('Microphone access error:', err);
      onError('(microphone access denied — check browser permissions)');
    }
  }, [startSilenceDetection]);

  return { isListening, setIsListening, startRecording, stopListening };
}
