import { NextRequest, NextResponse } from 'next/server';
import { evaluateAccusation } from '../../../src/lib/mistral';
import { sanitizeInput, validateString, isInjectionAttempt } from '../../../src/lib/sanitize';
import { rateLimit, getClientIp } from '../../../src/lib/rate-limit';
import { getSession, addMessage, useAccusation, restoreAccusation, issueWinToken, incrementAccusation, acquireSessionLock, releaseSessionLock, exportSession, DIFFICULTY_CLUES } from '../../../src/lib/game-session';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!rateLimit(ip, 30)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json();

    const session = getSession(body.sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const accusation = validateString(body.accusation, 1000);
    if (!accusation) {
      return NextResponse.json({ error: 'Accusation is required (max 1000 chars)' }, { status: 400 });
    }

    if (session.accusationsLeft <= 0) {
      return NextResponse.json({ error: 'No accusations remaining' }, { status: 403 });
    }

    const requiredClues = DIFFICULTY_CLUES[(session.caseData.difficulty as string) || 'medium'] || 3;
    if (session.cluesCollected < requiredClues) {
      return NextResponse.json(
        { error: `Not enough clues collected. Need ${requiredClues}, have ${session.cluesCollected}.` },
        { status: 403 },
      );
    }

    if (isInjectionAttempt(accusation)) {
      return NextResponse.json({
        correct: false,
        confession: "That's not even a real accusation. Try harder, detective.",
        explanation: "Invalid accusation format.",
      });
    }

    if (!acquireSessionLock(session.id)) {
      return NextResponse.json({ error: 'Accusation already in progress' }, { status: 409 });
    }

    try {
      useAccusation(session.id);
      incrementAccusation(session.id);
      const sanitized = sanitizeInput(accusation);

      try {
        const userMistralKey = req.headers.get('x-mistral-api-key') || undefined;
        const result = await evaluateAccusation(
          session.caseData as Parameters<typeof evaluateAccusation>[0],
          session.conversationHistory,
          sanitized,
          userMistralKey,
        );

        addMessage(session.id, 'user', `[ACCUSATION] ${sanitized}`);
        addMessage(session.id, 'assistant', (result.confession as string) || '');
        result.accusationsLeft = session.accusationsLeft;

        if (result.correct) {
          const winToken = issueWinToken(session.id);
          if (winToken) result.winToken = winToken;
          exportSession(session.id, 'win', sanitized, true);
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
