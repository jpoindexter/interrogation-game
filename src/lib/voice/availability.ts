import { NextResponse } from 'next/server';
import { storageBackend } from '../storage/backend';

/** Shared audio receipts/objects are required before hosted voice can spend provider credits. */
export function hostedVoiceFailure(): NextResponse | null {
  try {
    if (storageBackend() === 'local') return null;
    return NextResponse.json({ error: 'Voice is not enabled in this hosted preview. Continue with text.',
      code: 'HOSTED_VOICE_UNAVAILABLE' }, { status: 503 });
  } catch {
    return NextResponse.json({ error: 'Voice storage is not configured. Continue with text.', code: 'STORAGE_UNAVAILABLE' }, { status: 503 });
  }
}
