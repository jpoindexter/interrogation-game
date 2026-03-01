import { NextRequest, NextResponse } from 'next/server';
import { evaluateWin, generateLossSummary } from '../../../src/lib/mistral';
import { validateNumber, sanitizeInput } from '../../../src/lib/sanitize';
import { rateLimit, getClientIp } from '../../../src/lib/rate-limit';
import { getSession, deleteSession, exportSession } from '../../../src/lib/game-session';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (!rateLimit(ip, 30)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();

    if (!body.type || !['win', 'lose'].includes(body.type)) {
      return NextResponse.json({ error: 'Invalid evaluation type' }, { status: 400 });
    }

    const session = getSession(body.sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const caseData = session.caseData as Parameters<typeof evaluateWin>[0] & Parameters<typeof generateLossSummary>[0];
    const history = session.conversationHistory;

    let result;
    if (body.type === 'win') {
      const accusation = typeof body.playerAccusation === 'string'
        ? sanitizeInput(body.playerAccusation.slice(0, 1000)) : '';
      result = await evaluateWin(caseData, history, accusation);
    } else {
      const maxStress = validateNumber(body.maxStress, 0, 10) ?? 0;
      result = await generateLossSummary(caseData, history, maxStress);
    }

    if (body.type === 'lose') {
      const lastMsg = session.conversationHistory.at(-1)?.content ?? '';
      const outcome = lastMsg.includes('[Time') ? 'lose_time'
        : lastMsg.includes('[The detective') ? 'lose_giveup'
        : 'lose_accusations' as const;
      exportSession(session.id, outcome);
    }

    deleteSession(session.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error during evaluation:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate' },
      { status: 500 }
    );
  }
}
