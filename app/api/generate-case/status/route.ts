import { NextRequest, NextResponse } from 'next/server';
import { readGenerationStatus } from '@/lib/session/generation-status';
import { requestBudgetFailure } from '@/lib/limits/http';
import { getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  const limited = requestBudgetFailure(`generation:status:${getClientIp(request)}`, 90);
  if (limited) return limited;
  try {
    const status = readGenerationStatus(request.nextUrl.searchParams.get('requestId') ?? '');
    return NextResponse.json(status ?? { phase: null, startedAt: null, state: 'unavailable' }, {
      status: status ? 200 : 404, headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ phase: null, startedAt: null, state: 'unavailable' }, {
      status: 503, headers: { 'Cache-Control': 'no-store' },
    });
  }
}
