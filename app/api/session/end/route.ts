import { requestBudgetFailure } from '@/lib/limits/http';
import { acceptedTimestamp } from '../../../../src/lib/session/accepted-time';
import type { GameSession } from '../../../../src/lib/session/types';
import { NextRequest, NextResponse } from 'next/server';
import { runSessionRequest } from '../../../../src/lib/session/dispatch';
import { expireSession, finishSession } from '../../../../src/lib/session/transitions';
import { terminalResponse } from '../../../../src/lib/session/turn';
import { publicSessionStatus } from '../../../../src/lib/session/public-status';
import { exportSession } from '../../../../src/lib/session/export';
import { getClientIp } from '../../../../src/lib/rate-limit';

export async function POST(request: NextRequest) {
  const budgetFailure = await requestBudgetFailure(`session:end:${getClientIp(request)}`, 20);
  if (budgetFailure) return budgetFailure;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  if (!['giveup', 'time'].includes(String(body?.reason))) return NextResponse.json({ error: 'reason must be giveup or time' }, { status: 400 });
  try {
    const response = await runSessionRequest({ sessionId: String(body.sessionId || ''), requestId: body.requestId,
      fingerprint: { operation: 'end', reason: body.reason }, run: async session => {
        expireSession(session);
        if (!session.outcome && body.reason === 'giveup') finishSession(session, 'lose_giveup');
        if (!session.outcome) return { status: 409, body: { error: 'The server deadline has not elapsed', code: 'DEADLINE_NOT_REACHED' } };
        const spokenResponse = recordEnding(session);
        const delivery = await exportSession(session.id, session.outcome);
        return { status: 200, body: { ...terminalResponse(session), spoken_response: spokenResponse, ...publicSessionStatus(session), export: delivery } };
      } });
    return NextResponse.json(response.body, { status: response.status });
  } catch { return NextResponse.json({ error: 'Session save could not be confirmed. Retry the same request ID.', code: 'STORAGE_UNAVAILABLE' }, { status: 503 }); }
}

function recordEnding(session: GameSession): string {
  const last = session.conversationHistory.findLast(message => message.role === 'assistant');
  if (session.outcome === 'win') return last?.content ?? '';
  const text = terminalResponse(session).spoken_response;
  if (last?.content !== text) session.conversationHistory.push({ role: 'assistant', kind: 'terminal', content: text,
    timestamp: acceptedTimestamp(session) });
  return text;
}
