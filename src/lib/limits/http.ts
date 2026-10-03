import { NextResponse } from 'next/server';
import { rateLimitDecision } from '../rate-limit';

/** A failed budget store is a service failure, not evidence the player exceeded a limit. */
export function requestBudgetFailure(key: string, maxPerMinute: number): NextResponse | null {
  const decision = rateLimitDecision(key, maxPerMinute);
  if (decision === 'allowed') return null;
  if (decision === 'exhausted') {
    return NextResponse.json({ error: 'Too many requests. Try again shortly.', code: 'RATE_LIMITED' },
      { status: 429, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } });
  }
  return NextResponse.json({ error: 'Request budget storage is unavailable. Retry the same request shortly.', code: 'BUDGET_UNAVAILABLE' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } });
}
