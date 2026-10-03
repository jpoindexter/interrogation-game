import { actionParameters, hashKey, parseKind, sessionKey, type ActionClaim } from './contracts';
import { integer, invalidResponse, requireInput, supabaseRpc, type HostedRpc } from './rpc';

type Scope = 'ai' | 'tts' | 'stt';
export interface WorkReservation {
  deployment: string;
  sessionId: string;
  operationId: string;
  fingerprint: string;
  scope: Scope;
  units: number;
  policy: { sessionCalls: number; sessionUnits: number; deploymentCalls: number; deploymentUnits: number; windowSeconds: number };
}
export type ReservationResult = { kind: 'reserved' | 'already_reserved'; scope: Scope; units: number; windowStart: number; windowEnd: number }
  | { kind: 'exhausted'; scope: 'session' | 'deployment' }
  | { kind: 'invalid' | 'conflict' | 'policy_conflict' };
export type ClaimedReservationResult = ReservationResult | { kind: 'stale' } | { kind: 'unavailable' };

function reservationWindow(result: Record<string, unknown>, input: WorkReservation) {
  if (result.scope !== input.scope || result.units !== input.units || !integer(result.windowStart)
    || !integer(result.windowEnd) || result.windowEnd - result.windowStart !== input.policy.windowSeconds) return invalidResponse();
  return { scope: input.scope, units: input.units, windowStart: result.windowStart, windowEnd: result.windowEnd };
}

export function reservationParameters(input: WorkReservation): Record<string, unknown> {
  const { policy } = input;
  requireInput(/^[A-Za-z0-9_.:-]{1,96}$/.test(input.deployment)
    && /^[A-Za-z0-9_.:-]{8,192}$/.test(input.operationId) && /^[a-f0-9]{64}$/.test(input.fingerprint));
  requireInput(['ai', 'tts', 'stt'].includes(input.scope)
    && [input.units, policy.sessionUnits, policy.deploymentUnits].every(value => integer(value) && value <= 1e12)
    && [policy.sessionCalls, policy.deploymentCalls].every(value => integer(value) && value <= 1e6)
    && integer(policy.windowSeconds, 60) && policy.windowSeconds <= 86400);
  return { p_deployment: input.deployment, p_session_key: sessionKey(input.sessionId),
    p_operation_key: hashKey(input.operationId), p_fingerprint: input.fingerprint, p_scope: input.scope, p_units: input.units,
    p_session_max_calls: policy.sessionCalls, p_session_max_units: policy.sessionUnits,
    p_deployment_max_calls: policy.deploymentCalls, p_deployment_max_units: policy.deploymentUnits,
    p_window_seconds: policy.windowSeconds };
}

export function parseReservation(value: unknown, input: WorkReservation): ClaimedReservationResult {
  const result = parseKind(value,
    ['reserved', 'already_reserved', 'exhausted', 'invalid', 'conflict', 'policy_conflict', 'stale', 'unavailable']);
  if (result.kind === 'exhausted') {
    if (result.scope !== 'session' && result.scope !== 'deployment') return invalidResponse();
    return { kind: 'exhausted', scope: result.scope };
  }
  if (result.kind !== 'reserved' && result.kind !== 'already_reserved') return { kind: result.kind } as ClaimedReservationResult;
  return { kind: result.kind, ...reservationWindow(result, input) };
}

/** Only `reserved` admits a new call. `already_reserved` means recover its result, never repeat paid work. */
export class HostedWorkStorage {
  constructor(private readonly rpc: HostedRpc = supabaseRpc) {}

  async reserve(input: WorkReservation): Promise<ReservationResult> {
    const result = parseReservation(await this.rpc('interrogation_reserve_work', reservationParameters(input)), input);
    if (result.kind === 'stale' || result.kind === 'unavailable') return invalidResponse();
    return result;
  }

  async reserveForClaim(input: WorkReservation, claim: ActionClaim): Promise<ClaimedReservationResult> {
    requireInput(input.sessionId === claim.sessionId && integer(claim.fence, 1) && integer(claim.revision));
    const identity = actionParameters(claim);
    return parseReservation(await this.rpc('interrogation_reserve_claimed_work', {
      ...reservationParameters(input), p_request_key: identity.p_request_key,
      p_action_fingerprint: identity.p_fingerprint, p_owner: identity.p_owner,
      p_fence: claim.fence, p_revision: claim.revision,
    }), input);
  }
}
