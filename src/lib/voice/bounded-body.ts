import { VoiceError } from './errors';

/** The deadline covers reading the provider body as well as receiving its headers. */
export async function readVoiceBytes(body: ReadableStream<Uint8Array> | null, limit: number, signal: AbortSignal): Promise<Uint8Array> {
  if (!body) throw new VoiceError('The voice provider returned no audio.', 502);
  const reader = body.getReader();
  const abort = () => { void reader.cancel(signal.reason).catch(() => {}); };
  signal.addEventListener('abort', abort, { once: true });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    signal.throwIfAborted();
    while (true) {
      const item = await reader.read();
      signal.throwIfAborted();
      if (item.done) break;
      size += item.value.length;
      if (size > limit) throw new VoiceError('Voice content exceeds the allowed size.', 413);
      chunks.push(item.value);
    }
    return Buffer.concat(chunks);
  } finally {
    signal.removeEventListener('abort', abort);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
