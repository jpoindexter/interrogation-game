import { requestBudgetFailure } from '@/lib/limits/http';
import { NextRequest } from 'next/server';
import { getClientIp } from '@/lib/rate-limit';
import { requestSpeech } from '@/lib/voice/requests';
import { voiceResponse } from '@/lib/voice/receipt-types';
import { voiceFailure } from '@/lib/voice/http';
import { hostedVoiceFailure } from '@/lib/voice/availability';

export async function POST(request: NextRequest) {
  const unavailable = hostedVoiceFailure();
  if (unavailable) return unavailable;
  const budgetFailure = await requestBudgetFailure(getClientIp(request), 30);
  if (budgetFailure) return budgetFailure;
  try { return voiceResponse(await requestSpeech(await request.json(), request.signal)); }
  catch (error) { return voiceFailure(error); }
}
