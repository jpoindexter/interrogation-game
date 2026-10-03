import { requestBudgetFailure } from '@/lib/limits/http';
import { NextRequest, NextResponse } from 'next/server';
import { getClientIp } from '../../../src/lib/rate-limit';
import { getSession, acquireSessionLock, releaseSessionLock, exportSession } from '../../../src/lib/game-session';
import { expireSession } from '../../../src/lib/session/transitions';
import { projectResult } from '../../../src/lib/session/result';

export async function POST(request: NextRequest) {
  const budgetFailure = requestBudgetFailure(getClientIp(request), 30);
  if (budgetFailure) return budgetFailure;
  try {
    const body = await request.json();
    if (!['win', 'lose'].includes(body.type)) return NextResponse.json({ error: 'Invalid evaluation type' }, { status: 400 });
    const session = getSession(body.sessionId);
    if (!session) return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    if (!acquireSessionLock(session.id)) return NextResponse.json({ error: 'Another action is in progress' }, { status: 409 });
    try {
      expireSession(session);
      if (!session.outcome || (body.type === 'win') !== (session.outcome === 'win')) {
        return NextResponse.json({ error: 'Requested result does not match the recorded outcome' }, { status: 409 });
      }
      const result = projectResult(session);
      const delivery = await exportSession(session.id, session.outcome);
      return NextResponse.json({ ...result, export: delivery });
    } finally {
      releaseSessionLock(session.id);
    }
  } catch {
    return NextResponse.json({ error: 'Unable to retrieve result. Please retry.' }, { status: 500 });
  }
}
