export class VoiceError extends Error {
  constructor(message: string, readonly status: number, readonly code = 'VOICE_FAILED', readonly upstreamStatus?: number) { super(message); }
}

export function voiceKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new VoiceError('Voice is not configured. Continue with text input.', 503);
  return key;
}
