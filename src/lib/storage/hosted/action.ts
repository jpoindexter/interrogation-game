import type { GameSession } from '../../session/types';
import type { SessionRecord } from '../../session/repository-types';
import type { SessionResponse } from '../../session/request-ledger';
import { withSessionWorkspace, type SessionWorkspace } from '../../session/workspace';
import { exportSession } from '../../session/export';
import { projectResult } from '../../session/result';
import { withAsyncAiReservation } from '../../limits/ai-scope';
import { aiWorkFailure } from '../../limits/ai-http';
import { AiWorkError } from '../../limits/ai-policy';
import { generationFingerprint } from '../../session/generation-store';
import { hashKey, type ActionClaim, type HostedSnapshot } from './contracts';
import { HostedSessionStorage } from './session';
import { HostedWorkStorage, type WorkReservation } from './budget';
import { parseHostedSessionRecord } from './validate-session';
import { HostedStorageError } from './rpc';

export interface HostedAction {
  sessionId: string; requestId: string; fingerprint: Record<string, unknown>;
  run: (session: GameSession) => Promise<SessionResponse>;
}
export interface HostedActionStores {
  sessions: HostedSessionStorage; work: HostedWorkStorage;
  deployment: string; policy: WorkReservation['policy'];
}
const failure = (status: number, code: string): SessionResponse => ({ status, body: { code,
  error: code === 'ACTION_FAILED' ? 'This action could not be completed. Review the recovered session before starting a new attempt.'
    : 'Recover this request before starting another attempt.' } });
const CLAIM_FAILURES = { busy: [409, 'ACTION_IN_PROGRESS'], conflict: [409, 'REQUEST_CONFLICT'],
  interrupted: [409, 'REQUEST_INTERRUPTED'], limit: [429, 'SESSION_LIMIT'],
  unavailable: [401, 'SESSION_UNAVAILABLE'], invalid: [400, 'INVALID_REQUEST'] } as const;

function reservation(claim: ActionClaim, stores: HostedActionStores) {
  let operation = 0;
  return async (task: Record<string, unknown>, characters: number) => {
    const result = await stores.work.reserveForClaim({ deployment: stores.deployment, sessionId: claim.sessionId,
      operationId: `${hashKey(claim.sessionId + ':' + claim.requestId)}:${++operation}`,
      fingerprint: generationFingerprint(task), scope: 'ai', units: characters, policy: stores.policy }, claim);
    if (result.kind === 'exhausted') throw new AiWorkError('AI_WORK_LIMIT', 'Shared AI allowance exhausted.', 429);
    if (result.kind !== 'reserved') throw new AiWorkError('AI_BUDGET_UNAVAILABLE', 'Shared work was not authorized. Recover the prior request.', 503);
  };
}
async function execute(request: HostedAction, workspace: SessionWorkspace): Promise<SessionResponse> {
  let response: SessionResponse;
  try { response = await request.run(workspace.record.session); }
  catch (cause) { response = aiWorkFailure(cause) ?? failure(502, 'ACTION_FAILED'); }
  response = { ...response, body: { ...response.body, requestId: request.requestId } };
  workspace.record.requests[hashKey(request.requestId)] = { hash: generationFingerprint(request.fingerprint),
    state: 'complete', startedAt: Date.now(), response };
  if (workspace.record.session.outcome) {
    projectResult(workspace.record.session);
    await exportSession(request.sessionId, workspace.record.session.outcome);
  }
  return response;
}
function storageSnapshot(record: SessionRecord): HostedSnapshot {
  const snapshot = { ...record, requests: {}, session: { ...record.session } };
  return snapshot;
}

/** Explicit integration entry point. Routing remains guarded until generation/admission/redemption are shared. */
export async function runHostedSessionRequest(request: HostedAction, stores: HostedActionStores): Promise<SessionResponse> {
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(request.requestId)) return failure(400, 'INVALID_REQUEST_ID');
  try {
    const claim = await stores.sessions.claim({ sessionId: request.sessionId, requestId: request.requestId,
      fingerprint: generationFingerprint(request.fingerprint) });
    if (claim.kind === 'replay') return claim.response;
    if (claim.kind !== 'claimed') {
      const [status, code] = CLAIM_FAILURES[claim.kind];
      return failure(status, code);
    }
    const record = parseHostedSessionRecord(claim.record);
    record.requests = await stores.sessions.receipts(request.sessionId);
    const workspace: SessionWorkspace = { record };
    const response = await withSessionWorkspace(workspace,
      () => withAsyncAiReservation(reservation(claim, stores), () => execute(request, workspace)));
    const next = storageSnapshot(record);
    parseHostedSessionRecord(next);
    const committed = await stores.sessions.complete(claim, next, response,
      workspace.terminalExport);
    if (committed.kind === 'committed' || committed.kind === 'replay') return committed.response;
    return failure(409, 'REQUEST_INTERRUPTED');
  } catch (cause) {
    return failure(503, cause instanceof HostedStorageError ? cause.code : 'STORAGE_UNAVAILABLE');
  }
}
