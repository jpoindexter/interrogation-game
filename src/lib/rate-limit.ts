import type { NextRequest } from 'next/server';
import { isIP } from 'node:net';
import { consumeEndpoint } from './limits/consume';

/** Endpoint-scoped buckets. Missing IP must share a bucket, never bypass the limit. */
export function getClientIp(request: NextRequest): string {
  const supplied = request.headers.get('x-real-ip')?.trim() ?? '';
  const address = process.env.VERCEL === '1' ? (isIP(supplied) ? supplied : 'unknown') : 'local';
  return `${request.nextUrl.pathname}:${address}`;
}

export type RateLimitDecision = 'allowed' | 'exhausted' | 'unavailable';

/** Durable local decision: unavailable storage is distinct from an exhausted allowance. */
export function rateLimitDecision(ip: string, maxPerMinute: number = 30): RateLimitDecision {
  try { return consumeEndpoint(ip, maxPerMinute) ? 'allowed' : 'exhausted'; }
  catch { return 'unavailable'; }
}

/** Compatibility for callers that only need a conservative allow/deny decision. */
export function rateLimit(ip: string, maxPerMinute: number = 30): boolean {
  return rateLimitDecision(ip, maxPerMinute) === 'allowed';
}
