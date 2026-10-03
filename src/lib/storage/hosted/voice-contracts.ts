import { hashKey, sessionKey } from './contracts';
import type { WorkReservation } from './budget';
import { integer, invalidResponse, object, requireInput } from './rpc';

export interface VoiceIdentity {
  sessionId: string; requestId: string; kind: 'tts' | 'stt'; fingerprint: string; revision: number;
}
export type VoiceReservation = Pick<WorkReservation, 'deployment' | 'units' | 'policy'>;
export interface HostedVoiceClaim extends Omit<VoiceIdentity, 'kind'> {
  kind: 'claimed' | 'recover'; voiceKind: 'tts' | 'stt'; owner: string; fence: number; leaseUntil: number; objectKey: string | null;
}
export type HostedVoiceResponse = { status: number; contentType: 'application/json'; body: string }
  | { status: 200; contentType: 'audio/mpeg'; objectKey: string; bytes: number; sha256: string };
export type VoiceClaimResult = HostedVoiceClaim | { kind: 'replay'; response: HostedVoiceResponse }
  | { kind: 'busy' | 'conflict' | 'interrupted' | 'expired' | 'unavailable' | 'stale' | 'limit' | 'invalid' | 'policy_conflict' }
  | { kind: 'exhausted'; scope: 'session' | 'deployment' };
export type VoiceFinishResult = { kind: 'committed' | 'replay'; response: HostedVoiceResponse }
  | { kind: 'stale' | 'conflict' | 'expired' | 'invalid' };

export function voiceObjectKey(input: Pick<VoiceIdentity, 'sessionId' | 'requestId'>): string {
  requireInput(/^[a-zA-Z0-9_-]{8,128}$/.test(input.requestId));
  return `${sessionKey(input.sessionId)}/tts/${hashKey(input.requestId)}.mp3`;
}
function exactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
function jsonBody(value: unknown): Record<string, unknown> {
  if (typeof value !== 'string' || Buffer.byteLength(value, 'utf8') > 32 * 1024) return invalidResponse();
  let body: unknown;
  try { body = JSON.parse(value); } catch { return invalidResponse(); }
  if (!object(body)) return invalidResponse();
  return body;
}
function jsonResponse(value: Record<string, unknown>, kind: VoiceIdentity['kind']): HostedVoiceResponse {
  if (!exactKeys(value, ['status', 'contentType', 'body'])) return invalidResponse();
  const body = jsonBody(value.body);
  const error = integer(value.status, 400) && Number(value.status) <= 599;
  if (!error && (kind !== 'stt' || value.status !== 200 || typeof body.text !== 'string' || !body.text.trim())) return invalidResponse();
  return { status: Number(value.status), contentType: 'application/json', body: value.body as string };
}
function audioResponse(value: Record<string, unknown>, input: Pick<VoiceIdentity, 'kind' | 'sessionId' | 'requestId'>): HostedVoiceResponse {
  if (input.kind !== 'tts' || value.status !== 200 || value.contentType !== 'audio/mpeg'
    || !exactKeys(value, ['status', 'contentType', 'objectKey', 'bytes', 'sha256'])
    || value.objectKey !== voiceObjectKey(input) || !integer(value.bytes, 1) || value.bytes > 8 * 1024 * 1024
    || typeof value.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.sha256)) return invalidResponse();
  return { status: 200, contentType: 'audio/mpeg', objectKey: value.objectKey as string, bytes: value.bytes, sha256: value.sha256 };
}
export function parseVoiceResponse(value: unknown, input: Pick<VoiceIdentity, 'kind' | 'sessionId' | 'requestId'>): HostedVoiceResponse {
  if (!object(value)) return invalidResponse();
  return value.contentType === 'application/json' ? jsonResponse(value, input.kind) : audioResponse(value, input);
}
