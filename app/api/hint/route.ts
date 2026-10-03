import { requestBudgetFailure } from '@/lib/limits/http';
import { NextRequest, NextResponse } from 'next/server';
import { runSessionRequest } from '@/lib/session/dispatch';
import { requestHint } from '@/lib/session/hints';
import { getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const budgetFailure = await requestBudgetFailure(getClientIp(request), 10);
  if (budgetFailure) return budgetFailure;
  try {
    const body = await request.json();
    const result = await runSessionRequest({
      sessionId: String(body?.sessionId || ''), requestId: body?.requestId,
      fingerprint: { operation: 'hint' }, run: async session => requestHint(session),
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ error: 'The hint could not be confirmed. Retry the same request.', code: 'STORAGE_UNAVAILABLE' }, { status: 503 });
  }
}
