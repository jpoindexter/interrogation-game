import { NextRequest, NextResponse } from 'next/server';
import { getSession, incrementHint, DIFFICULTY_CLUES } from '../../../src/lib/game-session';
import { rateLimit, getClientIp } from '../../../src/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (!rateLimit(ip, 10)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();

    const session = getSession(body.sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const stressTriggers = session.caseData.stress_triggers as string[] | undefined;
    if (!stressTriggers || !Array.isArray(stressTriggers)) {
      return NextResponse.json({ error: 'No hints available' }, { status: 404 });
    }

    const cluesNeeded = DIFFICULTY_CLUES[(session.caseData.difficulty as string) || 'medium'] || 3;
    const maxHints = Math.min(cluesNeeded, stressTriggers.length);

    if (session.hintsUsed >= maxHints) {
      return NextResponse.json({ error: 'All hints used' }, { status: 403 });
    }

    // Increment server-side hint count and return the next hint
    const newCount = incrementHint(session.id);
    const hint = stressTriggers[newCount - 1] ?? null;

    return NextResponse.json({ hint, hintsUsed: newCount, maxHints });
  } catch (error) {
    console.error('Hint error:', error);
    return NextResponse.json({ error: 'Failed to retrieve hint' }, { status: 500 });
  }
}
