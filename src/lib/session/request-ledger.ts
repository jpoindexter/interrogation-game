import { createHash } from 'node:crypto';
import { acquireSessionLock, getSession, getSessionRecord, persistSession, releaseSessionLock } from './store';
import type { GameSession } from './types';
import { withAiWorkScope } from '../limits/ai-scope';
import { aiWorkFailure } from '../limits/ai-http';

export interface SessionResponse { status: number; body: Record<string, unknown> }
interface SessionRequest {
  sessionId: string;
  requestId?: unknown;
  fingerprint: Record<string, unknown>;
  run: (session: GameSession) => Promise<SessionResponse>;
}
function error(status: number, code: string, message: string): SessionResponse {
  return { status, body: { error: message, code } };
}
function resolveRequestId(value: unknown): string | null {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{8,128}$/.test(value) ? value : null;
}
async function executeAction(request: SessionRequest, session: GameSession): Promise<SessionResponse> {
  try { return await withAiWorkScope(session.id, () => request.run(session)); }
  catch (cause) { return aiWorkFailure(cause) ?? error(502, 'ACTION_FAILED', 'This action could not be completed. Review the session and try a new attempt.'); }
}
async function executeLocked(request: SessionRequest, requestId: string): Promise<SessionResponse> {
  const record = getSessionRecord(request.sessionId)!;
  const hash = createHash('sha256').update(JSON.stringify(request.fingerprint)).digest('hex');
  const previous = record.requests[requestId];
  if (previous?.hash !== undefined && previous.hash !== hash) return error(409, 'REQUEST_CONFLICT', 'This request ID was already used for a different action.');
  if (previous?.state === 'complete' && previous.response) return previous.response;
  if (previous) return error(409, 'REQUEST_INTERRUPTED', 'The prior attempt was interrupted. Review the recovered session before starting another action.');
  if (Object.keys(record.requests).length >= 500) return error(429, 'SESSION_LIMIT', 'This session reached its action limit.');
  record.requests[requestId] = { hash, state: 'pending', startedAt: Date.now() };
  persistSession(request.sessionId);
  let response = await executeAction(request, record.session);
  response = { ...response, body: { ...response.body, requestId } };
  record.requests[requestId] = { hash, state: 'complete', startedAt: Date.now(), response };
  return response;
}

export async function runSessionRequest(request: SessionRequest): Promise<SessionResponse> {
  const requestId = resolveRequestId(request.requestId);
  if (!requestId) return error(400, 'INVALID_REQUEST_ID', 'requestId must contain 8–128 letters, digits, underscores or hyphens.');
  if (!getSession(request.sessionId)) return error(401, 'SESSION_UNAVAILABLE', 'Invalid or expired session');
  if (!acquireSessionLock(request.sessionId)) return error(409, 'ACTION_IN_PROGRESS', 'Another action is in progress. Retry this request ID.');
  try { return await executeLocked(request, requestId); }
  finally { releaseSessionLock(request.sessionId); }
}
