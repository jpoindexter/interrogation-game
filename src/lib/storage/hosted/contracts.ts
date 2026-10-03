import { createHash } from 'node:crypto';
import { integer, invalidResponse, object, requireInput } from './rpc';

/** Storage envelope only. Domain validation remains required before gameplay integration. */
export interface HostedSnapshot {
  version: 1;
  revision: number;
  session: Record<string, unknown> & { id: string };
  requests: Record<string, never>;
  token?: unknown;
}
export interface StoredResponse { status: number; body: Record<string, unknown> }
export interface ActionIdentity { sessionId: string; requestId: string; fingerprint: string; owner: string }
export interface ActionClaim extends ActionIdentity {
  kind: 'claimed'; record: HostedSnapshot; revision: number; fence: number; leaseUntil: number;
}
export type Replay = { kind: 'replay'; response: StoredResponse };
export type ClaimResult = ActionClaim | Replay | { kind: 'busy' | 'conflict' | 'interrupted' | 'limit' | 'unavailable' | 'invalid' };
export type CompleteResult = { kind: 'committed'; record: HostedSnapshot; response: StoredResponse }
  | Replay | { kind: 'stale' | 'conflict' | 'unavailable' | 'invalid' };

export function hashKey(value: string): string { return createHash('sha256').update(value).digest('hex'); }
export function sessionKey(sessionId: string): string {
  requireInput(typeof sessionId === 'string' && /^[a-f0-9]{48}$/.test(sessionId));
  return hashKey(sessionId);
}
export function actionParameters(identity: ActionIdentity): Record<string, unknown> {
  requireInput(/^[a-zA-Z0-9_-]{8,128}$/.test(identity.requestId)
    && /^[a-f0-9]{64}$/.test(identity.fingerprint)
    && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(identity.owner));
  return { p_key: sessionKey(identity.sessionId), p_request_key: hashKey(identity.requestId),
    p_fingerprint: identity.fingerprint, p_owner: identity.owner };
}
export function parseSnapshot(value: unknown, sessionId: string): HostedSnapshot {
  if (!object(value) || value.version !== 1 || !integer(value.revision)
    || !object(value.session) || value.session.id !== sessionId
    || !object(value.requests) || Object.keys(value.requests).length !== 0) return invalidResponse();
  return value as unknown as HostedSnapshot;
}
export function parseResponse(value: unknown): StoredResponse {
  if (!object(value) || !integer(value.status, 100) || value.status > 599 || !object(value.body)) return invalidResponse();
  return { status: value.status, body: value.body };
}
export function parseKind(value: unknown, allowed: readonly string[]): Record<string, unknown> & { kind: string } {
  if (!object(value) || typeof value.kind !== 'string' || !allowed.includes(value.kind)) return invalidResponse();
  return value as Record<string, unknown> & { kind: string };
}
