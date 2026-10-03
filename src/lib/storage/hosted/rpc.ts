import { getSupabaseClient } from '../../db';

export type HostedRpc = (name: string, parameters: Record<string, unknown>) => Promise<unknown>;

export class HostedStorageError extends Error {
  constructor(readonly code: 'STORAGE_UNAVAILABLE' | 'INVALID_STORAGE_RESPONSE' | 'INVALID_STORAGE_INPUT') {
    super(code === 'STORAGE_UNAVAILABLE'
      ? 'Shared storage did not confirm the operation. Recover the same request before starting new work.'
      : 'Shared storage contract validation failed.');
  }
}

/** No automatic retry: an absent response does not prove the transaction failed. */
export const supabaseRpc: HostedRpc = async (name, parameters) => {
  try {
    const { data, error } = await getSupabaseClient().rpc(name, parameters).retry(false);
    if (error) throw new HostedStorageError('STORAGE_UNAVAILABLE');
    return data;
  } catch { throw new HostedStorageError('STORAGE_UNAVAILABLE'); }
};

export function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
export function integer(value: unknown, minimum = 0): value is number {
  return Number.isSafeInteger(value) && Number(value) >= minimum;
}
export function requireInput(valid: boolean): asserts valid {
  if (!valid) throw new HostedStorageError('INVALID_STORAGE_INPUT');
}
export function invalidResponse(): never { throw new HostedStorageError('INVALID_STORAGE_RESPONSE'); }
