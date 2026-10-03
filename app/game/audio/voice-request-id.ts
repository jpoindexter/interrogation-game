const STORAGE_KEY = 'voiceRequestReceipts';
const MAX_RECEIPTS = 256;
const memory = new Map<string, string>();

async function digest(value: BufferSource): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', value));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function recordingHash(blob: Blob): Promise<string> { return digest(await blob.arrayBuffer()); }

function storedReceipts(): Record<string, string> {
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).length > MAX_RECEIPTS) return {};
    return Object.fromEntries(Object.entries(raw).filter(([key, value]) =>
      /^[a-f0-9]{64}$/.test(key) && typeof value === 'string' && /^[a-zA-Z0-9_-]{8,128}$/.test(value)));
  } catch { return {}; }
}

/** Only hashed identity and UUID are stored; audio and transcripts stay out of browser storage. */
export async function voiceRequestId(identity: readonly unknown[], newAttempt = false): Promise<string> {
  const key = await digest(new TextEncoder().encode(JSON.stringify(identity)));
  const stored = storedReceipts();
  const existing = memory.get(key) || stored[key];
  if (existing && !newAttempt) return existing;
  if (!existing && (memory.size >= MAX_RECEIPTS || Object.keys(stored).length >= MAX_RECEIPTS)) {
    throw new Error('This tab reached its voice receipt limit. Continue with text.');
  }
  const id = crypto.randomUUID();
  memory.set(key, id);
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, [key]: id })); }
  catch { /* Same-view retries still use memory; reload recovery is unavailable. */ }
  return id;
}
