export interface SilenceEnvironment {
  createContext: () => AudioContext;
  requestFrame: (callback: FrameRequestCallback) => number;
  cancelFrame: (frame: number) => void;
  now: () => number;
}
const browserEnvironment: SilenceEnvironment = {
  createContext: () => new AudioContext(),
  requestFrame: callback => requestAnimationFrame(callback),
  cancelFrame: frame => cancelAnimationFrame(frame), now: () => performance.now(),
};

function openAnalyser(stream: MediaStream, environment: SilenceEnvironment) {
  const context = environment.createContext();
  let source: MediaStreamAudioSourceNode | undefined;
  let analyser: AnalyserNode | undefined;
  const close = () => {
    source?.disconnect();
    analyser?.disconnect();
    void context.close().catch(() => undefined);
  };
  try {
    source = context.createMediaStreamSource(stream);
    analyser = context.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    return { analyser, close };
  } catch (error) { close(); throw error; }
}

/** Returns a disposer for the analyser, source, frame and AudioContext. */
export function detectSilence(stream: MediaStream, stop: () => void,
  environment: SilenceEnvironment = browserEnvironment): () => void {
  const { analyser, close } = openAnalyser(stream, environment);
  const samples = new Uint8Array(analyser.frequencyBinCount);
  let silence = 0;
  let previous = environment.now();
  let frame = 0;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    environment.cancelFrame(frame);
    close();
  };
  const check = () => {
    if (disposed) return;
    analyser.getByteFrequencyData(samples);
    const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
    const now = environment.now();
    silence = rms < 15 ? silence + (now - previous) / 1000 : 0;
    previous = now;
    if (silence >= 2) { dispose(); stop(); return; }
    frame = environment.requestFrame(check);
  };
  frame = environment.requestFrame(check);
  return dispose;
}
