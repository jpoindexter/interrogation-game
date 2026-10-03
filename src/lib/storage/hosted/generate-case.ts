import type { NextRequest } from 'next/server';
import { preparePlayableCase, createPlayableRecord, projectPlayableCase, type GenerationOptions } from '../../session/generate-case';
import type { GenerationContext } from '../../session/generation-requests';
import { generationFingerprint } from '../../session/generation-store';
import { generationFailure } from '../../session/generation-failure';
import type { SessionResponse } from '../../session/request-ledger';
import { withAsyncAiReservation } from '../../limits/ai-scope';
import { AiWorkError } from '../../limits/ai-policy';
import { hashKey, type HostedSnapshot } from './contracts';
import { HostedGenerationStorage, type GenerationClaim } from './generation';
import type { WorkReservation } from './budget';
import { parseHostedSessionRecord } from './validate-session';
import { HostedStorageError } from './rpc';

export interface HostedGenerationStores {
  generations: HostedGenerationStorage; deployment: string; policy: WorkReservation['policy'];
}
const failure = (status: number, code: string, error: string): SessionResponse => ({ status, body: { code, error } });
const CLAIM_FAILURES = {
  busy: [409, 'ACTION_IN_PROGRESS'], conflict: [409, 'REQUEST_CONFLICT'],
  interrupted: [409, 'REQUEST_INTERRUPTED'], expired: [410, 'GENERATION_EXPIRED'],
  limit: [429, 'GENERATION_LIMIT'], invalid: [400, 'INVALID_REQUEST'],
} as const;

function executionContext(claim: GenerationClaim, stores: HostedGenerationStores) {
  let phase: 'generating' | 'reviewing' = 'generating';
  let checkpointAttempted = Boolean(claim.checkpoint);
  const context: GenerationContext = {
    sessionId: claim.sessionId, checkpoint: claim.checkpoint,
    async reportProgress(next) {
      if (await stores.generations.write(claim, next) !== 'saved') throw new HostedStorageError('STORAGE_UNAVAILABLE');
      phase = next;
    },
    async saveCheckpoint(checkpoint) {
      checkpointAttempted = true;
      if (await stores.generations.write(claim, phase, checkpoint) !== 'saved') throw new HostedStorageError('STORAGE_UNAVAILABLE');
    },
  };
  return { context, hasCheckpointAttempt: () => checkpointAttempted };
}

function reservation(claim: GenerationClaim, stores: HostedGenerationStores) {
  let operation = 0;
  return async (task: Record<string, unknown>, units: number) => {
    const result = await stores.generations.reserve(claim, { deployment: stores.deployment, sessionId: claim.sessionId,
      operationId: `generation:${hashKey(claim.requestId)}:${++operation}`, fingerprint: generationFingerprint(task),
      scope: 'ai', units, policy: stores.policy });
    if (result.kind === 'exhausted') throw new AiWorkError('AI_WORK_LIMIT', 'Shared AI allowance exhausted.', 429);
    if (result.kind !== 'reserved') throw new AiWorkError('AI_BUDGET_UNAVAILABLE', 'Shared generation work was not authorized.', 503);
  };
}

async function execute(options: GenerationOptions, request: NextRequest, claim: GenerationClaim,
  stores: HostedGenerationStores): Promise<SessionResponse> {
  const progress = executionContext(claim, stores);
  let snapshot: HostedSnapshot | null = null;
  let response: SessionResponse;
  try {
    // One budget covers draft, review and optional retrieval, leaving time to persist.
    const available = Math.min(150_000, claim.leaseUntil - Date.now() - 15_000);
    if (available <= 0) throw new HostedStorageError('STORAGE_UNAVAILABLE');
    const preparation = { signal: AbortSignal.any([request.signal, AbortSignal.timeout(available)]) };
    const checkpoint = await withAsyncAiReservation(reservation(claim, stores),
      () => preparePlayableCase(options, preparation, progress.context));
    preparation.signal.throwIfAborted();
    const record = createPlayableRecord(options, claim.sessionId, checkpoint, claim.startedAt);
    snapshot = { ...record, session: { ...record.session }, requests: {} };
    parseHostedSessionRecord(snapshot);
    response = { status: 200, body: projectPlayableCase(record) };
  } catch (cause) {
    // A saved/uncertain checkpoint is recovered by the same intent. Never overwrite it with a failure.
    if (progress.hasCheckpointAttempt() || cause instanceof HostedStorageError) throw cause;
    response = generationFailure(cause);
  }
  const completed = await stores.generations.finish(claim, snapshot, response);
  if (completed.kind === 'committed' || completed.kind === 'replay') return completed.response;
  throw new HostedStorageError('STORAGE_UNAVAILABLE');
}

/** Shared generation entry point; public route selection awaits shared endpoint admission. */
export async function runHostedGeneration(input: {
  requestId: unknown; options: GenerationOptions; request: NextRequest;
}, stores: HostedGenerationStores): Promise<SessionResponse> {
  if (typeof input.requestId !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(input.requestId)) {
    return failure(400, 'INVALID_REQUEST_ID', 'A stable request ID is required.');
  }
  try {
    const claim = await stores.generations.claim(input.requestId, generationFingerprint({ ...input.options }));
    if (claim.kind === 'replay') return claim.response;
    if (claim.kind !== 'claimed') {
      const [status, code] = CLAIM_FAILURES[claim.kind];
      return failure(status, code, claim.kind === 'interrupted'
        ? 'Case preparation stopped before a recoverable case was saved. Explicitly start a new attempt.'
        : 'Recover this generation request before starting another attempt.');
    }
    return await execute(input.options, input.request, claim, stores);
  } catch {
    return failure(503, 'STORAGE_UNAVAILABLE', 'Case creation could not be confirmed. Recover the same request before starting new work.');
  }
}
