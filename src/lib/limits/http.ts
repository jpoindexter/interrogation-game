import { NextResponse } from 'next/server';
import { rateLimitDecision } from '../rate-limit';
import { hostedStores, storageBackend } from '../storage/backend';

/** A failed budget store is a service failure, not evidence the player exceeded a limit. */
export async function requestBudgetFailure(key: string, maxPerMinute: number): Promise<NextResponse | null> {
  let decision: 'allowed' | 'exhausted' | 'unavailable';
  try {
    if (storageBackend() === 'local') decision = rateLimitDecision(key, maxPerMinute);
    else {
      const { admission, deployment } = hostedStores();
      decision = await admission.admit({ deployment, key, maxPerMinute });
    }
  } catch { decision = 'unavailable'; }
  if (decision === 'allowed') return null;
  if (decision === 'exhausted') {
    return NextResponse.json({ error: 'Too many requests. Try again shortly.', code: 'RATE_LIMITED' },
      { status: 429, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } });
  }
  return NextResponse.json({ error: 'Request budget storage is unavailable. Retry the same request shortly.', code: 'BUDGET_UNAVAILABLE' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } });
}
