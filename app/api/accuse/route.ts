import { NextRequest, NextResponse } from 'next/server';
import { evaluateAccusation } from '../../../src/lib/mistral';
import { sanitizeInput, validateString, isInjectionAttempt } from '../../../src/lib/sanitize';
import { rateLimit } from '../../../src/lib/rate-limit';
import { getSession, addMessage, useAccusation, restoreAccusation } from '../../../src/lib/game-session';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!rateLimit(ip, 30)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json();

    // Validate session
    const session = getSession(body.sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const accusation = validateString(body.accusation, 1000);
    if (!accusation) {
      return NextResponse.json({ error: 'Accusation is required (max 1000 chars)' }, { status: 400 });
    }

    // Check accusations remaining (server-side enforcement)
    if (session.accusationsLeft <= 0) {
      return NextResponse.json({ error: 'No accusations remaining' }, { status: 403 });
    }

    // Block flagged injection attempts
    if (isInjectionAttempt(accusation)) {
      return NextResponse.json({
        correct: false,
        confession: "That's not even a real accusation. Try harder, detective.",
        explanation: "Invalid accusation format.",
      });
    }

    // Consume an accusation server-side
    useAccusation(session.id);

    const sanitized = sanitizeInput(accusation);

    try {
      const result = await evaluateAccusation(
        session.caseData as Parameters<typeof evaluateAccusation>[0],
        session.conversationHistory,
        sanitized,
      );

      // Store accusation in conversation
      addMessage(session.id, 'user', `[ACCUSATION] ${sanitized}`);
      addMessage(session.id, 'assistant', result.confession || '');

      // Include remaining accusations in response
      result.accusationsLeft = session.accusationsLeft;

      return NextResponse.json(result);
    } catch (error) {
      // Restore accusation on API failure
      restoreAccusation(session.id);
      throw error;
    }
  } catch (error) {
    console.error('Error evaluating accusation:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate accusation' },
      { status: 500 }
    );
  }
}
