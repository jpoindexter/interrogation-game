import { hashKey, parseKind } from './contracts';
import { integer, requireInput, supabaseRpc, type HostedRpc } from './rpc';

export interface AdmissionInput { deployment: string; key: string; maxPerMinute: number }
export type AdmissionDecision = 'allowed' | 'exhausted' | 'unavailable';

/** Shared fixed-minute admission. Caller supplies a stable endpoint/identity namespace. */
export class HostedAdmissionStorage {
  constructor(private readonly rpc: HostedRpc = supabaseRpc) {}

  async admit(input: AdmissionInput): Promise<AdmissionDecision> {
    try {
      requireInput(typeof input.deployment === 'string' && /^[A-Za-z0-9_.:-]{1,96}$/.test(input.deployment)
        && typeof input.key === 'string' && input.key.length > 0 && input.key.length <= 2048
        && integer(input.maxPerMinute, 1) && input.maxPerMinute <= 10_000);
      const result = parseKind(await this.rpc('interrogation_endpoint_admit', {
        p_deployment: input.deployment, p_key: hashKey(`endpoint:${input.key}`), p_max_per_minute: input.maxPerMinute,
      }), ['allowed', 'exhausted', 'policy_conflict', 'invalid', 'limit']);
      return result.kind === 'allowed' || result.kind === 'exhausted' ? result.kind : 'unavailable';
    } catch { return 'unavailable'; }
  }
}
