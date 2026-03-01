import { useRef, useState, useCallback } from 'react';

export function useVoiceRecorder(sessionId?: string) {
  const [isListening, setIsListening] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const transcribe = useCallback(async (blob: Blob): Promise<string> => {
    const fd = new FormData();
    fd.append('audio', blob, 'recording.webm');
    if (sessionIdRef.current) fd.append('sessionId', sessionIdRef.current);
    const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return (data.text ?? '').trim();
  }, []);

  const stopListening = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    cancelAnimationFrame(rafRef.current);
    setIsListening(false);
  }, []);

  const startSilenceDetection = useCallback((stream: MediaStream) => {
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    silenceRef.current = 0;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    let last = performance.now();
    const check = () => {
      analyser.getByteFrequencyData(buf);
      const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length);
      const now = performance.now();
      if (rms < 15) { silenceRef.current += (now - last) / 1000; if (silenceRef.current >= 2) { stopListening(); ctx.close(); return; } }
      else silenceRef.current = 0;
      last = now;
      rafRef.current = requestAnimationFrame(check);
    };
    rafRef.current = requestAnimationFrame(check);
  }, [stopListening]);

  const startRecording = useCallback(async (
    onTranscript: (t: string) => void,
    onError: (msg: string) => void,
    setLastTranscript?: (t: string) => void,
  ) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(m => MediaRecorder.isTypeSupported(m)) || 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        cancelAnimationFrame(rafRef.current);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: mime });
        if (blob.size < 2000) { onError('(no speech detected — try again)'); return; }
        try {
          setLastTranscript?.('(transcribing...)');
          const text = await transcribe(blob);
          text ? onTranscript(text) : onError('(no speech detected — try again)');
        } catch { onError('(transcription failed — try again or type below)'); }
      };
      recorder.start(250);
      setIsListening(true);
      startSilenceDetection(stream);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
        onError(isIOS && /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
          ? '(mic blocked — go to Settings > Safari > Microphone to enable)'
          : '(mic access denied — allow microphone in browser settings, or tap the keyboard icon to type)');
      } else onError('(microphone unavailable — use the keyboard icon to type instead)');
    }
  }, [startSilenceDetection]);

  return { isListening, setIsListening, startRecording, stopListening };
}
