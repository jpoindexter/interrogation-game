import type { AudioHandle } from './speech-player';

export function followSpeech(audio: AudioHandle, length: number, update: (index: number) => void): () => void {
  let frame = 0;
  let index = 0;
  const tick = () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      const target = Math.min(length, audio.currentTime / audio.duration * length);
      const delta = target - index;
      if (delta > 0) index += Math.min(delta, Math.max(delta * 0.3, 1));
      update(Math.floor(index));
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}
