import type { Case } from '@/lib/game-state';
import { generationIntent, type GenerationIntent } from './generation-receipt';
import { parsePublicCase } from './public-case-validation';
import { watchCaseProgress, type CasePreparationPhase } from './case-progress';
export { parsePublicCase } from './public-case-validation';

interface LoadOptions extends GenerationIntent {
  requestId: string;
  signal: AbortSignal;
  onProgress?: (phase: CasePreparationPhase) => void;
}

const newAttemptCodes = ['ACTION_FAILED', 'REQUEST_INTERRUPTED', 'GENERATION_INTERRUPTED', 'GENERATION_EXPIRED', 'REQUEST_CONFLICT', 'CASE_REVIEW_REJECTED', 'INVALID_CASE_CONTENT',
  'AI_WORK_DISABLED', 'AI_WORK_LIMIT', 'AI_INPUT_LIMIT', 'AI_BUDGET_UNAVAILABLE',
  'TIMEOUT', 'CANCELLED', 'CODEX_FAILED', 'CODEX_UNAVAILABLE', 'INVALID_REVIEW_EVIDENCE', 'INVALID_RESPONSE'];

export class CaseGenerationError extends Error {
  constructor(message: string, readonly code: string | null, readonly requestId: string) { super(message); }
  get requiresNewAttempt(): boolean { return newAttemptCodes.includes(this.code ?? ''); }
}

function generationError(response: Response, value: unknown, requestId: string): CaseGenerationError {
  const body = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const detail = typeof body.error === 'string' ? body.error : 'Case creation could not be confirmed.';
  const code = typeof body.code === 'string' ? body.code : null;
  const guidance = newAttemptCodes.includes(code ?? '')
    ? 'Review this error, then start a new attempt.' : 'Retry the same request to recover its outcome.';
  return new CaseGenerationError(`${detail} (HTTP ${response.status}). ${guidance}`, code, requestId);
}

export async function loadCase(options: LoadOptions): Promise<Case> {
  const stopWatching = watchCaseProgress(options.requestId, options.onProgress);
  try {
    const response = await fetchGeneration(options);
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) throw generationError(response, data, options.requestId);
    return parsePublicCase(data);
  } finally { stopWatching(); }
}

async function fetchGeneration(options: LoadOptions): Promise<Response> {
  try {
    return await fetch('/api/generate-case', {
      method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: options.requestId, ...generationIntent(options) }),
      signal: AbortSignal.any([options.signal, AbortSignal.timeout(210_000)]),
    });
  } catch (cause) {
    if (options.signal.aborted) throw cause;
    throw new CaseGenerationError('Case creation could not be confirmed. The connection failed or the request limit was reached. Retry the same request to recover its outcome.', null, options.requestId);
  }
}
