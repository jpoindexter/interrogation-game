import { NextResponse } from 'next/server';
import { storageBackend } from '../storage/backend';
import { hostedVoiceConfiguration } from '../config/hosted-voice';

/** Shared audio receipts/objects are required before hosted voice can spend provider credits. */
export function hostedVoiceFailure(): NextResponse | null {
  try {
    if (storageBackend() === 'local') return null;
    if (process.env.HOSTED_VOICE_ENABLED !== 'true') return NextResponse.json({ error: 'Voice is not enabled in this hosted preview. Continue with text.',
      code: 'HOSTED_VOICE_UNAVAILABLE' }, { status: 503 });
    hostedVoiceConfiguration();
    return null;
  } catch {
    return NextResponse.json({ error: 'Voice storage is not configured. Continue with text.', code: 'STORAGE_UNAVAILABLE' }, { status: 503 });
  }
}
