import { requestBudgetFailure } from '@/lib/limits/http';
import { NextRequest } from 'next/server';
import { getClientIp } from '@/lib/rate-limit';
import { requestSpeech } from '@/lib/voice/requests';
import { voiceResponse } from '@/lib/voice/receipt-types';
import { voiceFailure } from '@/lib/voice/http';
import { hostedVoiceFailure } from '@/lib/voice/availability';
import { storageBackend } from '@/lib/storage/backend';
import { requestHostedSpeech } from '@/lib/voice/hosted-requests';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const unavailable = hostedVoiceFailure();
  if (unavailable) return unavailable;
  const budgetFailure = await requestBudgetFailure(getClientIp(request), 30);
  if (budgetFailure) return budgetFailure;
  try {
    const body = await request.json();
    return voiceResponse(await (storageBackend() === 'supabase'
      ? requestHostedSpeech(body, request.signal) : requestSpeech(body, request.signal)));
  }
  catch (error) { return voiceFailure(error); }
}
