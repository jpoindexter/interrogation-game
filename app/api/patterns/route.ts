import { requestBudgetFailure } from '@/lib/limits/http';
import { NextRequest, NextResponse } from 'next/server';
import { getClientIp } from '../../../src/lib/rate-limit';
import { getSession } from '../../../src/lib/game-session';
import { validateDifficulty } from '../../../src/lib/sanitize';
import { AiError } from '../../../src/lib/ai/contracts';
import { retrievalEnabled } from '../../../src/lib/ai/retrieval/config';
import { DISABLED_RETRIEVAL, retrievePatterns, storeSessionPattern } from '../../../src/lib/ai/retrieval/service';

export async function POST(req: NextRequest) {
  if (!retrievalEnabled()) return NextResponse.json(DISABLED_RETRIEVAL);
  const budgetFailure = await requestBudgetFailure(`patterns:write:${getClientIp(req)}`, 5);
  if (budgetFailure) return budgetFailure;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const sessionId = readSessionId(body);
  if (typeof sessionId !== 'string') return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  try {
    // Every outcome, question and statistic comes from the terminal server session.
    return NextResponse.json(await storeSessionPattern(session));
  } catch (error) {
    const unfinished = error instanceof AiError && error.code === 'SESSION_UNFINISHED';
    return NextResponse.json({ status: 'unavailable', stored: false,
      error: unfinished ? error.message : 'Optional historical storage is unavailable.' }, { status: unfinished ? 409 : 503 });
  }
}

export async function GET(req: NextRequest) {
  if (!retrievalEnabled()) return NextResponse.json(DISABLED_RETRIEVAL);
  const budgetFailure = await requestBudgetFailure(`patterns:read:${getClientIp(req)}`, 10);
  if (budgetFailure) return budgetFailure;
  const url = new URL(req.url);
  const difficulty = validateDifficulty(url.searchParams.get('difficulty'));
  if (!difficulty) return NextResponse.json({ error: 'Valid difficulty is required' }, { status: 400 });
  try {
    return NextResponse.json(await retrievePatterns((url.searchParams.get('setting') || 'any').slice(0, 100), difficulty));
  } catch {
    return NextResponse.json({ status: 'unavailable', tactics: [], totalGames: 0,
      error: 'Optional historical retrieval is unavailable.' }, { status: 503 });
  }
}

function readSessionId(body: unknown): unknown {
  return body && typeof body === 'object' && 'sessionId' in body ? body.sessionId : null;
}
