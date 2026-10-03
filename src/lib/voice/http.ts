import { NextResponse } from 'next/server';
import { VoiceError } from './errors';
import { HostedStorageError } from '../storage/hosted/rpc';

export function voiceFailure(error: unknown) {
  if (error instanceof VoiceError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  if (error instanceof HostedStorageError) return NextResponse.json({ error: 'Voice storage is unavailable. Retry the same request or continue with text.',
    code: 'VOICE_STORAGE_UNAVAILABLE' }, { status: 503 });
  const aborted = error instanceof DOMException && ['AbortError', 'TimeoutError'].includes(error.name);
  return NextResponse.json({ error: aborted ? 'Voice request timed out or was cancelled.' : 'Voice is unavailable. Continue with text.' }, { status: aborted ? 504 : 502 });
}
