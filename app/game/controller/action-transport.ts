interface ActionRequest<T> {
  path: string;
  body: Record<string, unknown>;
  attempt: { id: string; acknowledge: () => void };
  signal: AbortSignal;
  parse: (value: unknown) => T;
}
function envelope(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('The server returned an invalid response. Retry to recover the same action.');
  }
  return value as Record<string, unknown>;
}

async function readResponse(response: Response): Promise<Record<string, unknown>> {
  let value: unknown;
  try { value = await response.json(); }
  catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new Error('The server response could not be read. Your input is preserved; retry to recover the same action.');
  }
  return envelope(value);
}

/** A success is acknowledged only after its entire public response is validated. */
export async function requestGameAction<T>(options: ActionRequest<T>): Promise<T> {
  const { path, body, attempt, signal, parse } = options;
  const response = await fetch(path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, requestId: attempt.id }),
    signal: AbortSignal.any([signal, AbortSignal.timeout(60_000)]),
  });
  const data = await readResponse(response);
  signal.throwIfAborted();
  if (!response.ok || data.error !== undefined) {
    if (typeof data.error !== 'string' || !data.error.trim()) throw new Error('The server returned an invalid error. Retry the same action.');
    const transient = response.status === 429 || response.status === 503
      || ['ACTION_IN_PROGRESS', 'STORAGE_UNAVAILABLE', 'BUDGET_UNAVAILABLE', 'RATE_LIMITED'].includes(String(data.code));
    const completedReceipt = data.requestComplete === true && data.requestId === attempt.id;
    if (!transient || completedReceipt) attempt.acknowledge();
    throw new Error(data.error);
  }
  const parsed = parse(data);
  signal.throwIfAborted();
  attempt.acknowledge();
  return parsed;
}
