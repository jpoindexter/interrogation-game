import { hostedStores, storageBackend } from '../storage/backend';
import { runHostedSessionRequest } from '../storage/hosted/action';
import { runSessionRequest as runLocalSessionRequest, type SessionResponse } from './request-ledger';
export type { SessionResponse } from './request-ledger';

/** Hosted failures stay hosted; a missing shared record never falls back to local files. */
export async function runSessionRequest(request: Parameters<typeof runLocalSessionRequest>[0]): Promise<SessionResponse> {
  if (storageBackend() === 'local') return runLocalSessionRequest(request);
  if (typeof request.requestId !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(request.requestId)) {
    return { status: 400, body: { error: 'A stable request ID is required.', code: 'INVALID_REQUEST_ID' } };
  }
  if (!/^[a-f0-9]{48}$/.test(request.sessionId)) {
    return { status: 401, body: { error: 'Invalid or expired session', code: 'SESSION_UNAVAILABLE' } };
  }
  return runHostedSessionRequest({ ...request, requestId: request.requestId }, hostedStores());
}
