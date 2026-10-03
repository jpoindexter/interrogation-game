import { NextResponse } from 'next/server';
import { VoiceError } from './errors';

export function voiceFailure(error: unknown) {
  if (error instanceof VoiceError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  const aborted = error instanceof DOMException && ['AbortError', 'TimeoutError'].includes(error.name);
  return NextResponse.json({ error: aborted ? 'Voice request timed out or was cancelled.' : 'Voice is unavailable. Continue with text.' }, { status: aborted ? 504 : 502 });
}
