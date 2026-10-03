import { requestBudgetFailure } from '@/lib/limits/http';
import { NextRequest, NextResponse } from 'next/server';
import { acquireSessionLock, getSession, releaseSessionLock } from '../../../src/lib/session/store';
import { expireSession } from '../../../src/lib/session/transitions';
import { publicSessionStatus } from '../../../src/lib/session/public-status';
import { exportSession } from '../../../src/lib/session/export';
import { getClientIp } from '../../../src/lib/rate-limit';

export async function GET(request: NextRequest) {
  const budgetFailure = requestBudgetFailure(`session:read:${getClientIp(request)}`, 60);
  if (budgetFailure) return budgetFailure;
  try {
    const session = getSession(request.nextUrl.searchParams.get('sessionId') || '');
    if (!session) return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    if (!acquireSessionLock(session.id)) return NextResponse.json({ error: 'Another action is in progress' }, { status: 409 });
    try {
      expireSession(session);
      const delivery = session.outcome ? await exportSession(session.id, session.outcome) : undefined;
      return NextResponse.json({ ...publicSessionStatus(session), ...(delivery ? { export: delivery } : {}) }, {
        headers: { 'Cache-Control': 'no-store' },
      });
    } finally { releaseSessionLock(session.id); }
  } catch { return NextResponse.json({ error: 'Session storage unavailable or unsupported in this deployment' }, { status: 503 }); }
}
