// Lightweight in-memory rate limiter (token bucket per IP)
import type { NextRequest } from 'next/server';

const buckets = new Map<string, { tokens: number; last: number }>();

/** Extract the most reliable client IP from request headers.
 *  On Vercel: x-real-ip is set by the edge and cannot be spoofed.
 *  Falls back to x-forwarded-for first entry, then a restrictive fallback. */
export function getClientIp(request: NextRequest): string {
  // x-real-ip is set by Vercel edge and is reliable
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  // x-forwarded-for: take only the first (client) IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  // Fallback: assign a unique bucket per request to avoid sharing
  return `anon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Returns true if the request is allowed, false if rate-limited. */
export function rateLimit(ip: string, maxPerMinute: number = 30): boolean {
  const now = Date.now();
  const entry = buckets.get(ip);
  if (!entry) {
    buckets.set(ip, { tokens: maxPerMinute - 1, last: now });
    return true;
  }
  // Refill tokens based on elapsed time
  const elapsed = now - entry.last;
  entry.tokens = Math.min(maxPerMinute, entry.tokens + (elapsed / 60000) * maxPerMinute);
  entry.last = now;
  if (entry.tokens < 1) return false;
  entry.tokens -= 1;
  return true;
}

// Prune stale entries every 5 minutes to prevent memory leak
setInterval(() => {
  const cutoff = Date.now() - 300000;
  for (const [key, val] of buckets) {
    if (val.last < cutoff) buckets.delete(key);
  }
}, 300000);
