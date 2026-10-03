import { randomUUID } from 'node:crypto';
import { hashKey, parseKind, parseResponse, type HostedSnapshot, type StoredResponse } from './contracts';
import { integer, invalidResponse, object, requireInput, supabaseRpc, type HostedRpc } from './rpc';
import { parseReservation, reservationParameters, type WorkReservation } from './budget';

interface GenerationIdentity { requestId: string; fingerprint: string; owner: string }
export interface GenerationClaim extends GenerationIdentity {
  kind: 'claimed'; sessionId: string; fence: number; leaseUntil: number; startedAt: number;
  checkpoint?: Record<string, unknown>;
}
type ClaimResult = GenerationClaim | { kind: 'replay'; response: StoredResponse }
  | { kind: 'busy' | 'conflict' | 'interrupted' | 'expired' | 'limit' | 'invalid' };
type FinishResult = { kind: 'committed' | 'replay'; response: StoredResponse }
  | { kind: 'stale' | 'conflict' | 'expired' | 'invalid' };
type Phase = 'preparing' | 'generating' | 'reviewing' | 'ready';

function requestKey(requestId: string) {
  requireInput(/^[a-zA-Z0-9_-]{8,128}$/.test(requestId));
  return hashKey(requestId);
}
function identity(input: GenerationIdentity): Record<string, unknown> {
  requireInput(/^[a-f0-9]{64}$/.test(input.fingerprint)
    && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(input.owner));
  return { p_key: requestKey(input.requestId), p_fingerprint: input.fingerprint, p_owner: input.owner };
}
function claimed(input: GenerationClaim): Record<string, unknown> {
  requireInput(integer(input.fence, 1));
  return { ...identity(input), p_fence: input.fence };
}

/** Staged shared generation adapter. Exact replay never authorizes additional inference. */
export class HostedGenerationStorage {
  constructor(private readonly rpc: HostedRpc = supabaseRpc) {}

  async claim(requestId: string, fingerprint: string): Promise<ClaimResult> {
    const input = { requestId, fingerprint, owner: randomUUID() };
    const result = parseKind(await this.rpc('interrogation_generation_claim', identity(input)),
      ['claimed', 'replay', 'busy', 'conflict', 'interrupted', 'expired', 'limit', 'invalid']);
    if (result.kind === 'replay') return { kind: 'replay', response: parseResponse(result.response) };
    if (result.kind !== 'claimed') return { kind: result.kind } as ClaimResult;
    if (typeof result.sessionId !== 'string' || !/^[a-f0-9]{48}$/.test(result.sessionId)
      || !integer(result.fence, 1) || !integer(result.leaseUntil, 1) || !integer(result.startedAt, 1)
      || (result.checkpoint !== undefined && !object(result.checkpoint))) return invalidResponse();
    return { ...input, kind: 'claimed', sessionId: result.sessionId, fence: result.fence,
      leaseUntil: result.leaseUntil, startedAt: result.startedAt,
      checkpoint: result.checkpoint as Record<string, unknown> | undefined };
  }

  async write(claim: GenerationClaim, phase: 'generating' | 'reviewing', checkpoint?: Record<string, unknown>) {
    requireInput(phase === 'generating' || phase === 'reviewing');
    if (checkpoint !== undefined) requireInput(object(checkpoint) && object(checkpoint.data));
    const result = parseKind(await this.rpc('interrogation_generation_write', {
      ...claimed(claim), p_phase: phase, p_checkpoint: checkpoint ?? null,
    }), ['saved', 'stale', 'conflict', 'expired', 'invalid']);
    return result.kind;
  }

  async finish(claim: GenerationClaim, record: HostedSnapshot | null, response: StoredResponse): Promise<FinishResult> {
    parseResponse(response);
    requireInput(record === null || record.session.id === claim.sessionId);
    const result = parseKind(await this.rpc('interrogation_generation_finish', {
      ...claimed(claim), p_record: record, p_response: response,
    }), ['committed', 'replay', 'stale', 'conflict', 'expired', 'invalid']);
    if (result.kind === 'committed' || result.kind === 'replay') return { kind: result.kind, response: parseResponse(result.response) };
    return { kind: result.kind } as FinishResult;
  }

  async status(requestId: string): Promise<{ phase: Phase; state: 'pending' | 'complete' | 'interrupted' | 'expired'; startedAt: number } | null> {
    const result = parseKind(await this.rpc('interrogation_generation_status', { p_key: requestKey(requestId) }),
      ['status', 'unavailable', 'invalid']);
    if (result.kind === 'unavailable') return null;
    if (result.kind !== 'status' || !['preparing', 'generating', 'reviewing', 'ready'].includes(String(result.phase))
      || !['pending', 'complete', 'interrupted', 'expired'].includes(String(result.state)) || !integer(result.startedAt, 1)) return invalidResponse();
    return { phase: result.phase as Phase, state: result.state as 'pending' | 'complete' | 'interrupted' | 'expired', startedAt: result.startedAt };
  }

  async reserve(claim: GenerationClaim, input: WorkReservation) {
    requireInput(input.sessionId === claim.sessionId && input.scope === 'ai');
    const params = claimed(claim);
    const result = await this.rpc('interrogation_generation_reserve_work', {
      ...reservationParameters(input), p_generation_key: params.p_key,
      p_generation_fingerprint: params.p_fingerprint, p_owner: params.p_owner, p_fence: claim.fence,
    });
    if (object(result) && result.kind === 'expired') return { kind: 'unavailable' as const };
    return parseReservation(result, input);
  }
}
