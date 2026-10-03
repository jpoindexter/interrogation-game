import { requestBudgetFailure } from '@/lib/limits/http';
import { ensureNotAborted } from '../../../src/lib/ai/execution';
import { NextRequest, NextResponse } from 'next/server';
import { evaluateAccusation } from '../../../src/lib/mistral';
import { sanitizeInput, validateString } from '../../../src/lib/sanitize';
import { getClientIp } from '../../../src/lib/rate-limit';
import { exportSession } from '../../../src/lib/session/export';
import { accusationError, judgeAccusation } from '../../../src/lib/session/accusation';
import { runSessionRequest, type SessionResponse } from '../../../src/lib/session/request-ledger';
import type { GameSession } from '../../../src/lib/session/types';

async function runAccusation(session: GameSession, accusation: string, signal: AbortSignal): Promise<SessionResponse> {
  ensureNotAborted(signal);
  const invalid = accusationError(session);
  if (invalid) return { status: 409, body: { error: invalid, outcome: session.outcome } };
  const text = sanitizeInput(accusation);
  const result = await judgeAccusation(session, text, () => evaluateAccusation(
    session.caseData as Parameters<typeof evaluateAccusation>[0], session.conversationHistory, text, { signal }));
  const delivery = session.outcome ? await exportSession(session.id, session.outcome) : undefined;
  return { status: 200, body: { ...result, ...(delivery ? { export: delivery } : {}) } };
}
export async function POST(request: NextRequest) {
  const budgetFailure = requestBudgetFailure(`accuse:${getClientIp(request)}`, 30);
  if (budgetFailure) return budgetFailure;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const accusation = validateString(body?.accusation, 1000);
  if (!accusation) return NextResponse.json({ error: 'Accusation is required (max 1000 chars)' }, { status: 400 });
  try {
    const response = await runSessionRequest({ sessionId: String(body.sessionId || ''), requestId: body.requestId,
      fingerprint: { operation: 'accuse', accusation }, run: session => runAccusation(session, accusation, request.signal) });
    return NextResponse.json(response.body, { status: response.status });
  } catch { return NextResponse.json({ error: 'Session save could not be confirmed. Retry the same request ID.', code: 'STORAGE_UNAVAILABLE' }, { status: 503 }); }
}
