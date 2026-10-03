import { randomUUID } from 'node:crypto';
import type { GameExport } from '../../session/exports/storage';
import type { RequestRecord } from '../../session/repository-types';
import { object } from './rpc';
import { supabaseRpc, integer, invalidResponse, requireInput, type HostedRpc } from './rpc';
import { actionParameters, hashKey, parseKind, parseResponse, parseSnapshot, sessionKey,
  type ActionClaim, type ActionIdentity, type ClaimResult, type CompleteResult, type HostedSnapshot, type StoredResponse } from './contracts';

/** Shared authority selected only by validated server configuration. */
export class HostedSessionStorage {
  constructor(private readonly rpc: HostedRpc = supabaseRpc) {}

  async create(record: HostedSnapshot) {
    const key = sessionKey(record.session.id);
    requireInput(record.revision === 0 && Object.keys(record.requests).length === 0);
    const result = parseKind(await this.rpc('interrogation_session_create', { p_key: key, p_record: record }),
      ['created', 'exists', 'conflict', 'unavailable', 'invalid']);
    if (result.kind === 'created' || result.kind === 'exists') {
      return { kind: result.kind, record: parseSnapshot(result.record, record.session.id) };
    }
    return { kind: result.kind };
  }

  async load(sessionId: string): Promise<HostedSnapshot | null> {
    const result = parseKind(await this.rpc('interrogation_session_load', { p_key: sessionKey(sessionId) }),
      ['loaded', 'unavailable', 'invalid']);
    if (result.kind === 'invalid') return invalidResponse();
    return result.kind === 'loaded' ? parseSnapshot(result.record, sessionId) : null;
  }

  async receipts(sessionId: string): Promise<Record<string, RequestRecord>> {
    const result = parseKind(await this.rpc('interrogation_session_receipts', { p_key: sessionKey(sessionId) }), ['loaded', 'unavailable', 'invalid']);
    if (result.kind !== 'loaded' || !object(result.requests) || Object.keys(result.requests).length > 500) return invalidResponse();
    return Object.fromEntries(Object.entries(result.requests).map(([key, value]) => [key, parseRequest(key, value)]));
  }

  async claim(input: Omit<ActionIdentity, 'owner'> & { owner?: string }): Promise<ClaimResult> {
    const identity = { ...input, owner: input.owner ?? randomUUID() };
    const result = parseKind(await this.rpc('interrogation_action_claim', { ...actionParameters(identity), p_request_id: input.requestId }),
      ['claimed', 'replay', 'busy', 'conflict', 'interrupted', 'limit', 'unavailable', 'invalid']);
    if (result.kind === 'replay') return { kind: 'replay', response: parseResponse(result.response) };
    if (result.kind !== 'claimed') return { kind: result.kind } as ClaimResult;
    const record = parseSnapshot(result.record, identity.sessionId);
    if (!integer(result.revision) || result.revision !== record.revision
      || !integer(result.fence, 1) || !integer(result.leaseUntil, 1)) return invalidResponse();
    return { ...identity, kind: 'claimed', record, revision: result.revision, fence: result.fence, leaseUntil: result.leaseUntil };
  }

  async complete(claim: ActionClaim, record: HostedSnapshot, response: StoredResponse, terminalExport?: GameExport): Promise<CompleteResult> {
    requireInput(record.session.id === claim.sessionId && record.revision === claim.revision
      && integer(claim.fence, 1) && Object.keys(record.requests).length === 0);
    parseResponse(response);
    const result = parseKind(await this.rpc('interrogation_action_commit', { ...actionParameters(claim),
      p_fence: claim.fence, p_revision: claim.revision, p_record: record, p_response: response, p_export: terminalExport ?? null }),
    ['committed', 'replay', 'stale', 'conflict', 'unavailable', 'invalid']);
    if (result.kind === 'replay') return { kind: 'replay', response: parseResponse(result.response) };
    if (result.kind !== 'committed') return { kind: result.kind } as CompleteResult;
    const committed = parseSnapshot(result.record, claim.sessionId);
    if (committed.revision !== claim.revision + 1) return invalidResponse();
    return { kind: 'committed', record: committed, response: parseResponse(result.response) };
  }
}

function parseRequest(key: string, value: unknown): RequestRecord {
  if (!/^[a-f0-9]{64}$/.test(key) || !object(value) || typeof value.hash !== 'string'
    || !/^[a-f0-9]{64}$/.test(value.hash) || !integer(value.startedAt)) return invalidResponse();
  const publicId = parsePublicId(key, value.publicId);
  if (value.state === 'pending') return { hash: value.hash, publicId, state: 'pending', startedAt: value.startedAt };
  if (value.state !== 'complete') return invalidResponse();
  return { hash: value.hash, publicId, state: 'complete', startedAt: value.startedAt, response: parseResponse(value.response) };
}

function parsePublicId(key: string, value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(value)
    || hashKey(value) !== key) return invalidResponse();
  return value;
}
