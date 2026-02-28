// Lightweight in-memory rate limiter (token bucket per IP)

const buckets = new Map<string, { tokens: number; last: number }>();

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
