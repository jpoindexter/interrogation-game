import { AiError } from './contracts';

export interface AiExecution {
  signal?: AbortSignal;
  onProgress?: (phase: 'generating' | 'reviewing') => void;
}
/** Legacy credential strings are ignored; credentials are server configured. */
export function executionOptions(execution?: AiExecution | string): AiExecution {
  return typeof execution === 'object' ? execution : {};
}
export function ensureNotAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  if (signal.reason?.name === 'TimeoutError') throw new AiError('TIMEOUT', 'The AI request timed out. Retry the turn.');
  throw new AiError('CANCELLED', 'The AI request was cancelled.');
}
export function executionSignal(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const deadline = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, deadline]) : deadline;
}
