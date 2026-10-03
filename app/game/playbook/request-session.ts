/** Owns one session's in-flight request and unchanged-intent retry identifiers. */
export class GameplayRequestSession {
  private controller: AbortController | null = null;
  private retryIds = new Map<string, string>();
  active = true;

  constructor(readonly sessionId: string | null) {}
  activate(): void { this.active = true; }
  get busy(): boolean { return this.controller !== null; }

  requestId(intent: unknown, createId = () => crypto.randomUUID()): string {
    const fingerprint = JSON.stringify(intent);
    const existing = this.retryIds.get(fingerprint);
    if (existing) return existing;
    const id = createId();
    this.retryIds.set(fingerprint, id);
    return id;
  }

  complete(intent: unknown): void { this.retryIds.delete(JSON.stringify(intent)); }

  cancel(): void { this.active = false; this.controller?.abort(); }

  async post(body: unknown): Promise<unknown> {
    if (!this.active) throw new Error('This session is no longer active.');
    if (this.controller) throw new Error('Wait for the current request to finish.');
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(60_000)]);
    this.controller = controller;
    try {
      const response = await fetch('/api/gameplay', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal,
      });
      const data: unknown = await response.json();
      if (signal.aborted || !this.active) throw new Error('This request was cancelled or timed out. Retry the same request to recover it.');
      if (!response.ok) throw serverError(data);
      return data;
    } finally { if (this.controller === controller) this.controller = null; }
  }
}

export class GameplayRequestError extends Error {
  constructor(message: string, readonly code: string | null, readonly requestComplete = false) { super(message); }
  get requiresNewAttempt(): boolean { return this.requestComplete || this.code === 'ACTION_FAILED' || this.code === 'REQUEST_INTERRUPTED'; }
}

function serverError(value: unknown): GameplayRequestError {
  const fallback = 'The server could not process this request. Your draft is preserved.';
  if (!value || typeof value !== 'object') return new GameplayRequestError(fallback, null);
  const message = 'error' in value && typeof value.error === 'string' ? value.error : fallback;
  const code = 'code' in value && typeof value.code === 'string' ? value.code : null;
  return new GameplayRequestError(message, code, 'requestComplete' in value && value.requestComplete === true);
}

export function dialogueFailure(cause: unknown): { requiresNewAttempt: boolean; message: string } {
  const requiresNewAttempt = cause instanceof GameplayRequestError && cause.requiresNewAttempt;
  return { requiresNewAttempt, message: requiresNewAttempt
    ? `${cause instanceof GameplayRequestError ? cause.message : 'This attempt did not finish.'} Review the preserved draft and evidence before a new attempt.`
    : 'Could not assess this question. The draft and evidence are preserved. Retry sends the same request.' };
}
