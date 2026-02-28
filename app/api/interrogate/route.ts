import { NextRequest, NextResponse } from 'next/server';
import { interrogate } from '../../../src/lib/mistral';
import { sanitizeInput, validateString, isInjectionAttempt } from '../../../src/lib/sanitize';
import { rateLimit, getClientIp } from '../../../src/lib/rate-limit';
import { getSession, addMessage, updateStress, acquireSessionLock, releaseSessionLock } from '../../../src/lib/game-session';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (!rateLimit(ip, 30)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();

    // Validate session
    const session = getSession(body.sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const question = validateString(body.playerQuestion, 500);
    if (!question) {
      return NextResponse.json({ error: 'Question is required (max 500 chars)' }, { status: 400 });
    }

    // Block flagged injection attempts outright
    if (isInjectionAttempt(question)) {
      // Return an in-character deflection instead of processing
      const deflection = {
        spoken_response: "I don't understand what you're asking. Can we stay on topic?",
        stress_level: session.conversationHistory.filter(m => m.role === 'assistant').length > 0 ? 2 : 0,
        clue_unlocked: null,
        caught: false,
      };
      return NextResponse.json(deflection);
    }

    const sanitized = sanitizeInput(question);

    // Prevent race condition: lock session during question processing
    if (!acquireSessionLock(session.id)) {
      return NextResponse.json({ error: 'Question already in progress' }, { status: 409 });
    }

    try {
      const questionCount = session.conversationHistory.filter(m => m.role === 'user').length;
      // Use server-tracked stress — never trust client-supplied value
      const currentStress = session.currentStress;

      // Use server-side case data and conversation history
      const response = await interrogate(
        session.caseData as Parameters<typeof interrogate>[0],
        session.conversationHistory,
        sanitized,
        questionCount,
        currentStress,
      );

      // Store conversation on server
      addMessage(session.id, 'user', sanitized);
      addMessage(session.id, 'assistant', (response.spoken_response as string) || '');

      // Track stress server-side so client can't manipulate it
      updateStress(session.id, response.stress_level as number);

      return NextResponse.json(response);
    } finally {
      releaseSessionLock(session.id);
    }
  } catch (error) {
    console.error('Error during interrogation:', error);
    return NextResponse.json(
      { error: 'Failed to process interrogation' },
      { status: 500 }
    );
  }
}
