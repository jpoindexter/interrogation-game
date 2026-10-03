import { NextRequest, NextResponse } from 'next/server';
import { readGenerationStatus } from '@/lib/session/generation-status';
import { requestBudgetFailure } from '@/lib/limits/http';
import { getClientIp } from '@/lib/rate-limit';
import { hostedStores, storageBackend } from '@/lib/storage/backend';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const limited = await requestBudgetFailure(`generation:status:${getClientIp(request)}`, 90);
  if (limited) return limited;
  try {
    const requestId = request.nextUrl.searchParams.get('requestId') ?? '';
    if (!/^[a-zA-Z0-9_-]{8,128}$/.test(requestId)) return NextResponse.json({ phase: null, startedAt: null, state: 'unavailable' }, { status: 404 });
    const status = storageBackend() === 'supabase' ? await hostedStores().generations.status(requestId) : readGenerationStatus(requestId);
    return NextResponse.json(status ?? { phase: null, startedAt: null, state: 'unavailable' }, {
      status: status ? 200 : 404, headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ phase: null, startedAt: null, state: 'unavailable' }, {
      status: 503, headers: { 'Cache-Control': 'no-store' },
    });
  }
}
