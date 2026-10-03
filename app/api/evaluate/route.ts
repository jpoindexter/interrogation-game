import { requestBudgetFailure } from '@/lib/limits/http';
import { NextRequest, NextResponse } from 'next/server';
import { getClientIp } from '../../../src/lib/rate-limit';
import { runSessionRead } from '../../../src/lib/session/read-request';
import { exportSession } from '../../../src/lib/session/export';
import { expireSession } from '../../../src/lib/session/transitions';
import { projectResult } from '../../../src/lib/session/result';

export async function POST(request: NextRequest) {
  const budgetFailure = await requestBudgetFailure(getClientIp(request), 30);
  if (budgetFailure) return budgetFailure;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  if (!body || !['win', 'lose'].includes(String(body.type))) return NextResponse.json({ error: 'Invalid evaluation type' }, { status: 400 });
  try {
    const response = await runSessionRead(String(body.sessionId || ''), async session => {
      expireSession(session);
      if (!session.outcome || (body.type === 'win') !== (session.outcome === 'win')) {
        return { status: 409, body: { error: 'Requested result does not match the recorded outcome' } };
      }
      const result = projectResult(session);
      const delivery = await exportSession(session.id, session.outcome);
      return { status: 200, body: { ...result, export: delivery } };
    });
    return NextResponse.json(response.body, { status: response.status, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Unable to retrieve result. Please retry.', code: 'STORAGE_UNAVAILABLE' }, { status: 503 });
  }
}
