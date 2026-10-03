import { validateSubmission } from '../../leaderboard/redemption';
import { hashKey, parseKind, sessionKey } from './contracts';
import { integer, invalidResponse, object, supabaseRpc, type HostedRpc } from './rpc';

export interface HostedScoreReceipt { success: true; id: string; score: number; playerName: string }
export type HostedRedemption = { kind: 'redeemed' | 'replay'; receipt: HostedScoreReceipt }
  | { kind: 'invalid' | 'conflict' | 'busy' | 'unavailable' | 'unranked' };

/** Explicit staged adapter. Canonical score and grant consumption stay in one DB transaction. */
export class HostedRedemptionStorage {
  constructor(private readonly rpc: HostedRpc = supabaseRpc) {}

  async redeem(body: unknown): Promise<HostedRedemption> {
    const input = validateSubmission(body);
    const result = parseKind(await this.rpc('interrogation_redeem_win', {
      p_key: sessionKey(input.sessionId), p_token_hash: hashKey(input.winToken), p_player_name: input.playerName,
    }), ['redeemed', 'replay', 'invalid', 'conflict', 'busy', 'unavailable', 'unranked']);
    if (result.kind !== 'redeemed' && result.kind !== 'replay') return { kind: result.kind } as HostedRedemption;
    const receipt = result.receipt;
    if (!object(receipt) || receipt.success !== true || typeof receipt.id !== 'string'
      || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(receipt.id)
      || !integer(receipt.score) || receipt.playerName !== input.playerName) return invalidResponse();
    return { kind: result.kind, receipt: { success: true, id: receipt.id, score: receipt.score, playerName: receipt.playerName } };
  }
}
