const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const SIGNED_PATH = /^\/storage\/v1\/object\/sign\/[a-z0-9][a-z0-9-]{2,62}\/[a-f0-9]{64}\/tts\/[a-f0-9]{64}\.mp3$/;

interface SignedDelivery { audioUrl: string; expiresAt: number; bytes: number; sha256: string }

function failure(): Error { return new Error('Audio could not be loaded. Retry the same request.'); }

function validMetadata(item: Partial<SignedDelivery>): boolean {
  return typeof item.bytes === 'number' && Number.isSafeInteger(item.bytes)
    && item.bytes > 0 && item.bytes <= MAX_AUDIO_BYTES
    && typeof item.sha256 === 'string' && /^[a-f0-9]{64}$/.test(item.sha256);
}

function validExpiry(value: unknown): boolean {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > Date.now();
}

function validUrl(value: string): boolean {
  const url = new URL(value);
  return url.protocol === 'https:' && /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.supabase\.co$/.test(url.hostname)
    && !url.port && !url.username && !url.password && !url.hash && SIGNED_PATH.test(url.pathname)
    && Boolean(url.searchParams.get('token')) && [...url.searchParams.keys()].join(',') === 'token';
}

export function parseSignedDelivery(value: unknown): SignedDelivery {
  if (!value || typeof value !== 'object') throw failure();
  const item = value as Partial<SignedDelivery>;
  if (typeof item.audioUrl !== 'string' || !validMetadata(item) || !validExpiry(item.expiresAt)) throw failure();
  try { if (!validUrl(item.audioUrl)) throw failure(); } catch { throw failure(); }
  return item as SignedDelivery;
}

async function boundedBytes(response: Response, signal: AbortSignal, limit: number): Promise<Uint8Array<ArrayBuffer>> {
  if (!response.ok || !response.body || Number(response.headers.get('content-length')) > limit) throw failure();
  const reader = response.body.getReader();
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', abort, { once: true });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    signal.throwIfAborted();
    while (true) {
      const chunk = await reader.read();
      signal.throwIfAborted();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > limit) throw failure();
      chunks.push(chunk.value);
    }
    if (!size) throw failure();
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return bytes;
  } finally {
    signal.removeEventListener('abort', abort);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

async function signedAudio(response: Response, signal: AbortSignal): Promise<Uint8Array<ArrayBuffer>> {
  const json = await boundedBytes(response, signal, 8_192);
  let delivery: SignedDelivery;
  try { delivery = parseSignedDelivery(JSON.parse(new TextDecoder().decode(json))); } catch { throw failure(); }
  const audio = await fetch(delivery.audioUrl, {
    signal, credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', cache: 'no-store',
  });
  const bytes = await boundedBytes(audio, signal, delivery.bytes);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  signal.throwIfAborted();
  if (bytes.length !== delivery.bytes || sha256 !== delivery.sha256) throw failure();
  return bytes;
}

/** Both delivery modes become a bounded Blob owned by the existing SpeechPlayer lifecycle. */
export async function readAudioDelivery(response: Response, signal: AbortSignal): Promise<Blob> {
  try {
    const contentType = response.headers.get('content-type')?.split(';')[0].trim();
    if (contentType === 'application/json') return new Blob([await signedAudio(response, signal)], { type: 'audio/mpeg' });
    if (contentType !== 'audio/mpeg') throw failure();
    return new Blob([await boundedBytes(response, signal, MAX_AUDIO_BYTES)], { type: 'audio/mpeg' });
  } catch { throw failure(); }
}
