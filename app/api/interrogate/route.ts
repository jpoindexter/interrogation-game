import { requestBudgetFailure } from '@/lib/limits/http';
import { ensureNotAborted } from '../../../src/lib/ai/execution';
import { acceptAuthoredOpening } from '../../../src/lib/gameplay/session';
import { sessionProjection } from '../../../src/lib/session/turn';
import { NextRequest, NextResponse } from 'next/server';
import { interrogate } from '../../../src/lib/mistral';
import { sanitizeInput, validateString } from '../../../src/lib/sanitize';
import { getClientIp } from '../../../src/lib/rate-limit';
import { commitTurn, prepareTurn, terminalResponse } from '../../../src/lib/session/turn';
import { runSessionRequest, type SessionResponse } from '../../../src/lib/session/request-ledger';
import { exportSession } from '../../../src/lib/session/export';
import type { GameSession } from '../../../src/lib/session/types';

async function runTurn(session: GameSession, question: string, signal: AbortSignal): Promise<SessionResponse> {
  ensureNotAborted(signal);
  if (prepareTurn(session)) {
    return { status: 200, body: { ...terminalResponse(session), export: await exportSession(session.id, session.outcome!) } };
  }
  const opening = acceptAuthoredOpening(session, question);
  if (opening) return { status: 200, body: { spoken_response: opening, stress_level: 0, clue_unlocked: null, caught: false, ...sessionProjection(session) } };
  const sanitized = sanitizeInput(question);
  const response = await interrogate(session.caseData as Parameters<typeof interrogate>[0], session.conversationHistory,
    sanitized, session.questionsAsked, session.currentStress, session.learnedTactics, { signal });
  ensureNotAborted(signal);
  const body = commitTurn(session, sanitized, response);
  const delivery = session.outcome ? await exportSession(session.id, session.outcome) : undefined;
  return { status: 200, body: { ...body, ...(delivery ? { export: delivery } : {}) } };
}
export async function POST(request: NextRequest) {
  const budgetFailure = requestBudgetFailure(`interrogate:${getClientIp(request)}`, 30);
  if (budgetFailure) return budgetFailure;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const question = validateString(body?.playerQuestion, 500);
  if (!question) return NextResponse.json({ error: 'Question is required (max 500 chars)' }, { status: 400 });
  try {
    const response = await runSessionRequest({ sessionId: String(body.sessionId || ''), requestId: body.requestId,
      fingerprint: { operation: 'interrogate', question }, run: session => runTurn(session, question, request.signal) });
    return NextResponse.json(response.body, { status: response.status });
  } catch { return NextResponse.json({ error: 'Session save could not be confirmed. Retry the same request ID.', code: 'STORAGE_UNAVAILABLE' }, { status: 503 }); }
}
