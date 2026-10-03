import { AiError } from '../ai/contracts';
import { randomBytes } from 'node:crypto';
import { GenerationStore, generationDirectory, generationFingerprint, GENERATION_TTL, type GenerationReceipt } from './generation-store';
import type { SessionResponse } from './request-ledger';
import { withAiWorkScope } from '../limits/ai-scope';
import { aiWorkFailure } from '../limits/ai-http';

export interface GenerationContext {
  sessionId: string;
  checkpoint?: Record<string, unknown>;
  saveCheckpoint: (value: Record<string, unknown>) => void;
}
interface GenerationRequest {
  requestId: unknown;
  fingerprint: Record<string, unknown>;
  /** Checkpoint validated private inputs, then materialize context.sessionId and return its public case. */
  generate: (context: GenerationContext) => Promise<Record<string, unknown>>;
}
class CheckpointWriteError extends Error {}
function error(status: number, code: string, message: string): SessionResponse {
  return { status, body: { error: message, code } };
}
function replay(record: GenerationReceipt, fingerprint: string): SessionResponse | null {
  if (record.fingerprint !== fingerprint) return error(409, 'REQUEST_CONFLICT', 'This request ID was already used for different case options.');
  if (Date.now() - record.createdAt >= GENERATION_TTL) return error(410, 'GENERATION_EXPIRED', 'This generation receipt has expired. Resume a saved session or explicitly start a new case.');
  if (record.state === 'complete') return record.response!;
  if (record.checkpoint && record.sessionId) return null;
  return error(409, 'REQUEST_INTERRUPTED', 'The previous case generation was interrupted before a recoverable case was saved. Explicitly start another case to try again.');
}
function generationContext(record: GenerationReceipt, store: GenerationStore): GenerationContext {
  return { sessionId: record.sessionId!, checkpoint: record.checkpoint ? structuredClone(record.checkpoint) : undefined,
    saveCheckpoint(value) {
      try {
        const checkpoint = JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
        if (!checkpoint || typeof checkpoint !== 'object' || Array.isArray(checkpoint)) throw new Error('Invalid checkpoint');
        store.save({ ...record, checkpoint });
        record.checkpoint = checkpoint;
      } catch { throw new CheckpointWriteError('The generation checkpoint could not be saved'); }
    } };
}
function generationFailure(cause: unknown): SessionResponse {
  const budgetFailure = aiWorkFailure(cause);
  if (budgetFailure) return budgetFailure;
  if (cause instanceof AiError && cause.code === 'CASE_REVIEW_REJECTED') {
    return error(502, cause.code, 'The generated case failed its consistency review. No playable case was created. Start a new attempt.');
  }
  if (cause instanceof AiError && cause.code === 'INVALID_CASE_CONTENT') {
    return error(502, cause.code, 'The generated case contains unfinished text. No playable case was created. Start a new attempt.');
  }
  return error(502, 'ACTION_FAILED', 'Case generation could not be completed. Explicitly start a new attempt to try again.');
}
async function generateOnce(request: GenerationRequest, record: GenerationReceipt, store: GenerationStore): Promise<SessionResponse> {
  try {
    const body = await withAiWorkScope(record.sessionId!, () => request.generate(generationContext(record, store)));
    if (!body || typeof body !== 'object' || Array.isArray(body) || body.sessionId !== record.sessionId) throw new Error('Invalid public case');
    return { status: 200, body };
  } catch (cause) {
    if (record.checkpoint || cause instanceof CheckpointWriteError) throw cause;
    return generationFailure(cause);
  }
}
async function execute(request: GenerationRequest, store: GenerationStore): Promise<SessionResponse> {
  const fingerprint = generationFingerprint(request.fingerprint);
  let record = store.load();
  if (record) {
    const previous = replay(record, fingerprint);
    if (previous) return previous;
  } else {
    record = { version: 1, fingerprint, createdAt: Date.now(), state: 'pending', sessionId: randomBytes(24).toString('hex') };
    const admission = store.admit(record);
    if (admission === 'busy') return error(409, 'ACTION_IN_PROGRESS', 'Another generation request is being recorded. Retry this request ID.');
    if (admission === 'limit') return error(429, 'GENERATION_LIMIT', 'Local generation receipt storage reached its limit. Review and archive local demo data before generating more cases.');
  }
  const response = await generateOnce(request, record, store);
  store.save({ ...record, state: 'complete', response });
  return response;
}

/** A durable intent receipt prevents retries, remounts and lost responses from generating twice. */
export async function runGenerationRequest(request: GenerationRequest): Promise<SessionResponse> {
  if (typeof request.requestId !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(request.requestId)) {
    return error(400, 'INVALID_REQUEST_ID', 'A stable requestId of 8–128 letters, digits, underscores or hyphens is required.');
  }
  try {
    const store = new GenerationStore(generationDirectory(), request.requestId);
    const owner = store.acquire();
    if (!owner) return error(409, 'ACTION_IN_PROGRESS', 'This case generation is still running. Retry this request ID.');
    try { return await execute(request, store); }
    finally { store.release(owner); }
  } catch { return error(503, 'STORAGE_UNAVAILABLE', 'Generation storage is unavailable. Retry this request ID; hosted durable storage is not configured for this local demo.'); }
}
