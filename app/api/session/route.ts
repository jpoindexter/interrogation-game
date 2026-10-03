import { requestBudgetFailure } from '@/lib/limits/http';
import { NextRequest, NextResponse } from 'next/server';
import { runSessionRead } from '../../../src/lib/session/read-request';
import { expireSession } from '../../../src/lib/session/transitions';
import { publicSessionStatus } from '../../../src/lib/session/public-status';
import { exportSession } from '../../../src/lib/session/export';
import { getClientIp } from '../../../src/lib/rate-limit';

export async function GET(request: NextRequest) {
  const budgetFailure = await requestBudgetFailure(`session:read:${getClientIp(request)}`, 60);
  if (budgetFailure) return budgetFailure;
  try {
    const response = await runSessionRead(request.nextUrl.searchParams.get('sessionId') || '', async session => {
      expireSession(session);
      const delivery = session.outcome ? await exportSession(session.id, session.outcome) : undefined;
      return { status: 200, body: { ...publicSessionStatus(session), ...(delivery ? { export: delivery } : {}) } };
    });
    return NextResponse.json(response.body, { status: response.status, headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Session storage unavailable or unsupported in this deployment' }, { status: 503 }); }
}
