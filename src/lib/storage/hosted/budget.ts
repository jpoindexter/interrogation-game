import { hashKey, parseKind, sessionKey } from './contracts';
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

function reservationWindow(result: Record<string, unknown>, input: WorkReservation) {
  if (result.scope !== input.scope || result.units !== input.units || !integer(result.windowStart)
    || !integer(result.windowEnd) || result.windowEnd - result.windowStart !== input.policy.windowSeconds) return invalidResponse();
  return { scope: input.scope, units: input.units, windowStart: result.windowStart, windowEnd: result.windowEnd };
}

function reservationParameters(input: WorkReservation): Record<string, unknown> {
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

/** Only `reserved` admits a new call. `already_reserved` means recover its result, never repeat paid work. */
export class HostedWorkStorage {
  constructor(private readonly rpc: HostedRpc = supabaseRpc) {}

  async reserve(input: WorkReservation): Promise<ReservationResult> {
    const result = parseKind(await this.rpc('interrogation_reserve_work', reservationParameters(input)),
      ['reserved', 'already_reserved', 'exhausted', 'invalid', 'conflict', 'policy_conflict']);
    if (result.kind === 'exhausted') {
      if (result.scope !== 'session' && result.scope !== 'deployment') return invalidResponse();
      return { kind: 'exhausted', scope: result.scope };
    }
    if (result.kind !== 'reserved' && result.kind !== 'already_reserved') return { kind: result.kind } as ReservationResult;
    return { kind: result.kind, ...reservationWindow(result, input) };
  }
}
