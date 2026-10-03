import { VoiceError } from './errors';
import { voiceDirectory, voiceHash, VoiceReceiptStore } from './receipt-store';
import { MAX_RECEIPT_BYTES, VOICE_TTL, voiceReceiptError, type VoiceReceipt, type VoiceResult } from './receipt-types';

interface VoiceRequest {
  requestId: unknown;
  sessionId: string;
  kind: 'tts' | 'stt';
  fingerprint: string;
  work: (signal: AbortSignal) => Promise<VoiceResult>;
  signal: AbortSignal;
}
function replay(receipt: VoiceReceipt, fingerprint: string): VoiceResult {
  if (receipt.fingerprint !== fingerprint) return voiceReceiptError(409, 'REQUEST_CONFLICT', 'This voice request ID belongs to different content.');
  if (Date.now() - receipt.createdAt >= VOICE_TTL) return voiceReceiptError(410, 'VOICE_EXPIRED', 'This voice receipt expired. An explicit new attempt is required.');
  if (receipt.state === 'complete') return receipt.response!;
  return voiceReceiptError(409, 'VOICE_INTERRUPTED', 'The previous voice request was interrupted. It may have consumed provider usage. Review before starting a new attempt.');
}
function failure(error: unknown): VoiceResult {
  if (error instanceof VoiceError) return voiceReceiptError(error.status, error.code, error.message);
  return voiceReceiptError(502, 'VOICE_FAILED', 'The voice attempt could not be completed. It may have consumed provider usage. Continue with text or explicitly start a new attempt.');
}
async function execute(request: VoiceRequest, store: VoiceReceiptStore): Promise<VoiceResult> {
  const fingerprint = voiceHash(request.fingerprint);
  const previous = store.load();
  if (previous) return replay(previous, fingerprint);
  request.signal.throwIfAborted();
  const receipt: VoiceReceipt = { version: 1, fingerprint, createdAt: Date.now(), state: 'pending',
    reservedBytes: request.kind === 'tts' ? MAX_RECEIPT_BYTES : 32 * 1024 };
  if (!store.admit(receipt)) return voiceReceiptError(429, 'VOICE_CACHE_FULL', 'Local voice cache is full. Continue with text; review local demo data before making more voice requests.');
  let response: VoiceResult;
  // Once admitted, the bounded operation can finish even when the caller loses its connection.
  try { response = await request.work(AbortSignal.timeout(30_000)); }
  catch (error) { response = failure(error); }
  store.save({ ...receipt, state: 'complete', response });
  return response;
}

export async function runVoiceRequest(request: VoiceRequest): Promise<VoiceResult> {
  if (typeof request.requestId !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(request.requestId)) {
    return voiceReceiptError(400, 'INVALID_REQUEST_ID', 'A stable voice request ID is required.');
  }
  try {
    const store = new VoiceReceiptStore(voiceDirectory(), `${request.sessionId}:${request.kind}:${request.requestId}`);
    const owner = store.acquire();
    if (!owner) return voiceReceiptError(409, 'VOICE_IN_PROGRESS', 'This voice request is still running. Retry the same request ID.');
    try { return await execute(request, store); }
    finally { store.release(owner); }
  } catch {
    return voiceReceiptError(503, 'VOICE_STORAGE_UNAVAILABLE', 'Voice receipt storage is unavailable. Retry the same request or continue with text.');
  }
}
