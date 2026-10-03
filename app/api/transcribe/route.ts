import { requestBudgetFailure } from '@/lib/limits/http';
import { NextRequest } from 'next/server';
import { getClientIp } from '@/lib/rate-limit';
import { requestTranscription } from '@/lib/voice/requests';
import { voiceResponse } from '@/lib/voice/receipt-types';
import { voiceFailure } from '@/lib/voice/http';
import { readVoiceBytes } from '@/lib/voice/bounded-body';
import { hostedVoiceFailure } from '@/lib/voice/availability';
import { storageBackend } from '@/lib/storage/backend';
import { requestHostedTranscription } from '@/lib/voice/hosted-requests';
import { HOSTED_RECORDING_BYTES } from '@/lib/config/hosted-voice';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const unavailable = hostedVoiceFailure();
  if (unavailable) return unavailable;
  const budgetFailure = await requestBudgetFailure(getClientIp(request), 20);
  if (budgetFailure) return budgetFailure;
  try {
    const hosted = storageBackend() === 'supabase';
    const body = await readVoiceBytes(request.body, hosted ? HOSTED_RECORDING_BYTES + 64 * 1024 : 26 * 1024 * 1024, request.signal);
    const bounded = new Request(request.url, { method: 'POST', headers: request.headers, body: Buffer.from(body) });
    const form = await bounded.formData();
    return voiceResponse(await (hosted ? requestHostedTranscription(form, request.signal) : requestTranscription(form, request.signal)));
  } catch (error) { return voiceFailure(error); }
}
