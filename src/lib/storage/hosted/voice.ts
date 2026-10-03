import { randomUUID } from 'node:crypto';
import { actionParameters, parseKind } from './contracts';
import { reservationParameters } from './budget';
import { integer, invalidResponse, requireInput, supabaseRpc, type HostedRpc } from './rpc';
import { parseVoiceResponse, voiceObjectKey, type HostedVoiceClaim, type HostedVoiceResponse,
  type VoiceClaimResult, type VoiceFinishResult, type VoiceIdentity, type VoiceReservation } from './voice-contracts';
export type { HostedVoiceClaim, HostedVoiceResponse, VoiceClaimResult, VoiceFinishResult, VoiceIdentity, VoiceReservation } from './voice-contracts';

function identityParameters(input: VoiceIdentity, owner: string) {
  requireInput(['tts', 'stt'].includes(input.kind) && integer(input.revision));
  const identity = actionParameters({ ...input, owner });
  return { p_session_key: identity.p_key, p_request_key: identity.p_request_key,
    p_kind: input.kind, p_fingerprint: input.fingerprint, p_owner: owner };
}
function workParameters(input: VoiceIdentity, reservation: VoiceReservation) {
  requireInput(integer(reservation.units, 1) && reservation.units <= (input.kind === 'tts' ? 6000 : 3 * 1024 * 1024));
  const { p_deployment, p_units, p_session_max_calls, p_session_max_units,
    p_deployment_max_calls, p_deployment_max_units, p_window_seconds } = reservationParameters({
    ...reservation, sessionId: input.sessionId, scope: input.kind, fingerprint: input.fingerprint, operationId: 'voice-bound-operation',
  });
  return { p_deployment, p_units, p_session_max_calls, p_session_max_units,
    p_deployment_max_calls, p_deployment_max_units, p_window_seconds };
}
function parseClaim(value: unknown, input: VoiceIdentity, owner: string): VoiceClaimResult {
  const result = parseKind(value, ['claimed', 'recover', 'replay', 'busy', 'conflict', 'interrupted', 'expired',
    'unavailable', 'stale', 'limit', 'invalid', 'policy_conflict', 'exhausted']);
  if (result.kind === 'replay') return { kind: 'replay', response: parseVoiceResponse(result.response, input) };
  if (result.kind === 'exhausted') {
    if (result.scope !== 'session' && result.scope !== 'deployment') return invalidResponse();
    return { kind: 'exhausted', scope: result.scope };
  }
  if (result.kind !== 'claimed' && result.kind !== 'recover') return { kind: result.kind } as VoiceClaimResult;
  return parseGrant(result, input, owner);
}
function parseGrant(result: Record<string, unknown>, input: VoiceIdentity, owner: string): HostedVoiceClaim {
  if (!integer(result.fence, 1) || !integer(result.leaseUntil, 1)
    || result.objectKey !== (input.kind === 'tts' ? voiceObjectKey(input) : null)
    || (result.kind === 'recover' && input.kind !== 'tts')) return invalidResponse();
  const { kind: voiceKind, ...identity } = input;
  return { ...identity, kind: result.kind as 'claimed' | 'recover', voiceKind, owner, fence: result.fence,
    leaseUntil: result.leaseUntil, objectKey: result.objectKey as string | null };
}

/** Only claimed permits provider work. Recover means inspect a deterministic existing object, never synthesize. */
export class HostedVoiceStorage {
  constructor(private readonly rpc: HostedRpc = supabaseRpc) {}

  async claim(input: VoiceIdentity & { owner?: string; reservation: VoiceReservation }): Promise<VoiceClaimResult> {
    const owner = input.owner ?? randomUUID();
    const identity: VoiceIdentity = { sessionId: input.sessionId, requestId: input.requestId,
      kind: input.kind, fingerprint: input.fingerprint, revision: input.revision };
    return parseClaim(await this.rpc('interrogation_voice_claim', { ...identityParameters(identity, owner),
      p_revision: identity.revision, ...workParameters(identity, input.reservation) }), identity, owner);
  }

  async finish(claim: HostedVoiceClaim, response: HostedVoiceResponse): Promise<VoiceFinishResult> {
    const identity: VoiceIdentity = { ...claim, kind: claim.voiceKind };
    requireInput(integer(claim.fence, 1));
    parseVoiceResponse(response, identity);
    const result = parseKind(await this.rpc('interrogation_voice_finish', {
      ...identityParameters(identity, claim.owner), p_fence: claim.fence, p_response: response,
    }), ['committed', 'replay', 'stale', 'conflict', 'expired', 'invalid']);
    if (result.kind === 'committed' || result.kind === 'replay') return {
      kind: result.kind, response: parseVoiceResponse(result.response, identity),
    };
    return { kind: result.kind } as VoiceFinishResult;
  }
}
