import { requestBudgetFailure } from '@/lib/limits/http';
import { NextRequest, NextResponse } from 'next/server';
import { runSessionRequest } from '@/lib/session/request-ledger';
import { playDialogue, pinDialogue } from '@/lib/gameplay/interaction';
import { GameplayError } from '@/lib/gameplay/errors';
import { getClientIp } from '@/lib/rate-limit';
import type { GameSession } from '@/lib/session/types';

async function execute(session: GameSession, body: Record<string, unknown>, signal: AbortSignal) {
  try {
    const result = body.kind === 'pin' ? pinDialogue(session, body) : await playDialogue(session, body.action, signal);
    return { status: 200, body: result };
  } catch (error) {
    if (error instanceof GameplayError) return { status: 409, body: { error: error.message, code: error.code } };
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const budgetFailure = requestBudgetFailure(getClientIp(request), 40);
  if (budgetFailure) return budgetFailure;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  if (!body || !['pin', 'action'].includes(String(body.kind))) return NextResponse.json({ error: 'Choose a gameplay action.' }, { status: 400 });
  if (!body.requestId) return NextResponse.json({ error: 'A stable request ID is required.' }, { status: 400 });
  try {
    const fingerprint = body.kind === 'pin' ? { kind: 'pin', turnId: body.turnId, quote: body.quote }
      : { kind: 'action', action: body.action };
    const result = await runSessionRequest({ sessionId: String(body.sessionId || ''), requestId: body.requestId,
      fingerprint, run: session => execute(session, body, request.signal) });
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ error: 'Session save could not be confirmed. Retry the same action.', code: 'STORAGE_UNAVAILABLE' }, { status: 503 });
  }
}
