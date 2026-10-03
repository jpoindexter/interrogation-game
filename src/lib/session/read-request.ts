import { randomUUID } from 'node:crypto';
import { hostedStores, storageBackend } from '../storage/backend';
import { withAsyncAiReservation } from '../limits/ai-scope';
import { parseKind, parseSnapshot, sessionKey } from '../storage/hosted/contracts';
import { integer, invalidResponse, supabaseRpc, type HostedRpc } from '../storage/hosted/rpc';
import { parseHostedSessionRecord } from '../storage/hosted/validate-session';
import type { HostedSessionStorage } from '../storage/hosted/session';
import { acquireSessionLock, getSession, releaseSessionLock } from './store';
import { projectResult } from './result';
import { exportSession } from './export';
import { withSessionWorkspace, type SessionWorkspace } from './workspace';
import type { SessionResponse } from './request-ledger';
import type { GameSession } from './types';

type Projection = (session: GameSession) => Promise<SessionResponse>;
const unavailable = (): SessionResponse => ({ status: 401, body: { error: 'Invalid or expired session' } });
const busy = (): SessionResponse => ({ status: 409, body: { error: 'Another action is in progress', code: 'ACTION_IN_PROGRESS' } });
const interrupted = (): SessionResponse => ({ status: 409, body: { error: 'The session changed. Please retrieve it again.', code: 'REQUEST_INTERRUPTED' } });

export async function runSessionRead(sessionId: string, project: Projection): Promise<SessionResponse> {
  if (!/^[a-f0-9]{48}$/.test(sessionId)) return unavailable();
  if (storageBackend() === 'supabase') return runHostedSessionRead(sessionId, project, hostedStores().sessions);
  const session = getSession(sessionId);
  if (!session) return unavailable();
  if (!acquireSessionLock(sessionId)) return busy();
  try { return await project(session); }
  finally { releaseSessionLock(sessionId); }
}

function validateReadClaim(claim: Record<string, unknown>, sessionId: string) {
  if (claim.kind !== 'claimed' || !integer(claim.revision) || !integer(claim.fence, 1)
    || !integer(claim.leaseUntil, 1)) return invalidResponse();
  const record = parseHostedSessionRecord(parseSnapshot(claim.record, sessionId));
  if (record.session.id !== sessionId || record.revision !== claim.revision) return invalidResponse();
  return { record, revision: claim.revision, fence: claim.fence };
}

function readCompletion(value: unknown, sessionId: string, revision: number, response: SessionResponse): SessionResponse {
  const result = parseKind(value, ['committed', 'stale', 'conflict', 'unavailable', 'invalid']);
  if (result.kind === 'unavailable') return unavailable();
  if (result.kind !== 'committed') return interrupted();
  const committed = parseHostedSessionRecord(parseSnapshot(result.record, sessionId));
  if (committed.session.id !== sessionId || committed.revision !== revision + 1) return invalidResponse();
  return response;
}

/** Reads use a bounded transient lease, never the billable-action receipt namespace. */
export async function runHostedSessionRead(sessionId: string, project: Projection,
  sessions: HostedSessionStorage, rpc: HostedRpc = supabaseRpc): Promise<SessionResponse> {
  const p_key = sessionKey(sessionId), p_owner = randomUUID();
  const claim = parseKind(await rpc('interrogation_read_claim', { p_key, p_owner }), ['claimed', 'busy', 'unavailable', 'invalid']);
  if (claim.kind === 'busy') return busy();
  if (claim.kind === 'unavailable') return unavailable();
  const { record, revision, fence } = validateReadClaim(claim, sessionId);
  record.requests = await sessions.receipts(sessionId);
  const workspace: SessionWorkspace = { record };
  const response = await withSessionWorkspace(workspace, () => withAsyncAiReservation(async () => {
    throw new Error('Session read projections cannot authorize AI work');
  }, async () => {
    const projected = await project(record.session);
    if (record.session.outcome) { projectResult(record.session); await exportSession(sessionId, record.session.outcome); }
    return projected;
  }));
  const snapshot = { ...record, requests: {}, session: { ...record.session } };
  parseHostedSessionRecord(snapshot);
  const result = await rpc('interrogation_read_complete', { p_key, p_owner,
    p_revision: revision, p_fence: fence, p_record: snapshot, p_export: workspace.terminalExport ?? null });
  return readCompletion(result, sessionId, revision, response);
}
