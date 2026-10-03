import { requestBudgetFailure } from '@/lib/limits/http';
import { NextRequest } from 'next/server';
import { getClientIp } from '@/lib/rate-limit';
import { requestTranscription } from '@/lib/voice/requests';
import { voiceResponse } from '@/lib/voice/receipt-types';
import { voiceFailure } from '@/lib/voice/http';
import { readVoiceBytes } from '@/lib/voice/bounded-body';
import { hostedVoiceFailure } from '@/lib/voice/availability';

export async function POST(request: NextRequest) {
  const unavailable = hostedVoiceFailure();
  if (unavailable) return unavailable;
  const budgetFailure = await requestBudgetFailure(getClientIp(request), 20);
  if (budgetFailure) return budgetFailure;
  try {
    const body = await readVoiceBytes(request.body, 26 * 1024 * 1024, request.signal);
    const bounded = new Request(request.url, { method: 'POST', headers: request.headers, body: Buffer.from(body) });
    return voiceResponse(await requestTranscription(await bounded.formData(), request.signal));
  } catch (error) { return voiceFailure(error); }
}
