import { ControlError } from './errors';
import type { Pending } from './commands';

export interface Reply { status: number; data: Record<string, unknown> }
export function origin(): string {
  const url = new URL(process.env.AGENT_CONTROL_ORIGIN ?? 'http://127.0.0.1:3000');
  if (url.protocol !== 'http:' || !['127.0.0.1', '[::1]'].includes(url.hostname)
    || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new ControlError('AGENT_CONTROL_ORIGIN must be an HTTP loopback IP origin, e.g. http://127.0.0.1:3000.');
  }
  return url.origin;
}

export async function call(base: string, route: string, body?: Record<string, unknown>): Promise<Reply> {
  const response = await fetch(`${base}/api/${route}`, { redirect: 'error', cache: 'no-store',
    signal: AbortSignal.timeout(65000),
    ...(body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new ControlError('The server did not return a JSON object. Retry the saved request.');
  return { status: response.status, data: data as Record<string, unknown> };
}

export function settled(reply: Reply, pending: Pending): boolean {
  if (reply.status >= 200 && reply.status < 300) return true;
  if (reply.data.requestId === pending.body.requestId) return true;
  return [400, 401, 410].includes(reply.status)
    || ['ACTION_FAILED', 'CASE_REVIEW_REJECTED', 'INVALID_CASE_CONTENT'].includes(String(reply.data.code));
}

/** Remove bearer capabilities, while retaining normal public IDs for evidence actions. */
export function publicOutput(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(publicOutput);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !/^(sessionId|winToken|token|requestId)$/i.test(key))
    .map(([key, item]) => [key, publicOutput(item)]));
}
