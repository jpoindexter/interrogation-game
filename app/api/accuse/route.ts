import { NextRequest, NextResponse } from 'next/server';
import { evaluateAccusation } from '../../../src/lib/mistral';
import { sanitizeInput, validateString, isInjectionAttempt } from '../../../src/lib/sanitize';
import { rateLimit, getClientIp } from '../../../src/lib/rate-limit';
import { getSession, addMessage, useAccusation, restoreAccusation, issueWinToken, incrementAccusation, acquireSessionLock, releaseSessionLock, DIFFICULTY_CLUES } from '../../../src/lib/game-session';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
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

    // Enforce minimum clues collected before allowing accusation
    const requiredClues = DIFFICULTY_CLUES[(session.caseData.difficulty as string) || 'medium'] || 3;
    if (session.cluesCollected < requiredClues) {
      return NextResponse.json(
        { error: `Not enough clues collected. Need ${requiredClues}, have ${session.cluesCollected}.` },
        { status: 403 },
      );
    }

    // Block flagged injection attempts
    if (isInjectionAttempt(accusation)) {
      return NextResponse.json({
        correct: false,
        confession: "That's not even a real accusation. Try harder, detective.",
        explanation: "Invalid accusation format.",
      });
    }

    // Prevent race condition: lock session during accusation processing
    if (!acquireSessionLock(session.id)) {
      return NextResponse.json({ error: 'Accusation already in progress' }, { status: 409 });
    }

    try {
      // Consume an accusation server-side (inside lock)
      useAccusation(session.id);
      incrementAccusation(session.id);

      const sanitized = sanitizeInput(accusation);

      try {
        const result = await evaluateAccusation(
          session.caseData as Parameters<typeof evaluateAccusation>[0],
          session.conversationHistory,
          sanitized,
        );

        // Store accusation in conversation
        addMessage(session.id, 'user', `[ACCUSATION] ${sanitized}`);
        addMessage(session.id, 'assistant', (result.confession as string) || '');

        // Include remaining accusations in response
        result.accusationsLeft = session.accusationsLeft;

        // Issue a win token if correct — required for leaderboard submission
        if (result.correct) {
          const winToken = issueWinToken(session.id);
          if (winToken) result.winToken = winToken;
        }

        return NextResponse.json(result);
      } catch (error) {
        // Restore accusation on API failure
        restoreAccusation(session.id);
        throw error;
      }
    } finally {
      releaseSessionLock(session.id);
    }
  } catch (error) {
    console.error('Error evaluating accusation:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate accusation' },
      { status: 500 }
    );
  }
}
