export const VOICE_TTL = 24 * 60 * 60 * 1000;
export const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
export const MAX_RECEIPT_BYTES = 12 * 1024 * 1024;
export const MAX_CACHE_BYTES = 64 * 1024 * 1024;
export const MAX_VOICE_RECEIPTS = 256;
export interface VoiceResult { status: number; contentType: 'audio/mpeg' | 'application/json'; body: string }
export interface VoiceReceipt {
  version: 1;
  fingerprint: string;
  createdAt: number;
  reservedBytes: number;
  state: 'pending' | 'complete';
  response?: VoiceResult;
}
export function voiceJson(status: number, value: Record<string, unknown>): VoiceResult {
  return { status, contentType: 'application/json', body: JSON.stringify(value) };
}
export function voiceReceiptError(status: number, code: string, error: string): VoiceResult {
  return voiceJson(status, { code, error });
}
export function voiceResponse(result: VoiceResult): Response {
  const body = result.contentType === 'audio/mpeg' ? Buffer.from(result.body, 'base64') : result.body;
  return new Response(body, { status: result.status, headers: {
    'Content-Type': result.contentType, 'Cache-Control': 'private, no-store',
  } });
}
