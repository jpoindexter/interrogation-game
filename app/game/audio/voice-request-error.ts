const NEW_ATTEMPT = new Set(['VOICE_FAILED', 'VOICE_INTERRUPTED', 'VOICE_EXPIRED', 'REQUEST_CONFLICT']);
export class VoiceRequestError extends Error {
  constructor(message: string, readonly newAttemptRequired: boolean) { super(message); }
}
export async function requireVoiceSuccess(response: Response, fallback: string): Promise<void> {
  if (response.ok) return;
  let data: Record<string, unknown> = {};
  try {
    const value: unknown = await response.json();
    if (value && typeof value === 'object' && !Array.isArray(value)) data = value as Record<string, unknown>;
  } catch { /* Unknown delivery retains the same identity. */ }
  const message = typeof data.error === 'string' ? data.error : fallback;
  throw new VoiceRequestError(message, typeof data.code === 'string' && NEW_ATTEMPT.has(data.code));
}
