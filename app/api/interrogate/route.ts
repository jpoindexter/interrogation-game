import { NextRequest, NextResponse } from 'next/server';
import { interrogate } from '../../../src/lib/mistral';
import { sanitizeInput, validateString, isInjectionAttempt, isGibberish } from '../../../src/lib/sanitize';
import { rateLimit, getClientIp } from '../../../src/lib/rate-limit';
import { getSession, addMessage, updateStress, incrementClue, acquireSessionLock, releaseSessionLock } from '../../../src/lib/game-session';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (!rateLimit(ip, 30)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();

    const session = getSession(body.sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const question = validateString(body.playerQuestion, 500);
    if (!question) {
      return NextResponse.json({ error: 'Question is required (max 500 chars)' }, { status: 400 });
    }

    if (isInjectionAttempt(question)) {
      return NextResponse.json({
        spoken_response: "I don't understand what you're asking. Can we stay on topic?",
        stress_level: session.currentStress,
        clue_unlocked: null,
        caught: false,
      });
    }

    if (isGibberish(question)) {
      return NextResponse.json({
        spoken_response: "I'm sorry, what? That didn't make any sense. Ask me a real question.",
        stress_level: session.currentStress,
        clue_unlocked: null,
        caught: false,
      });
    }

    const sanitized = sanitizeInput(question);

    if (!acquireSessionLock(session.id)) {
      return NextResponse.json({ error: 'Question already in progress' }, { status: 409 });
    }

    try {
      const questionCount = session.conversationHistory.filter(m => m.role === 'user').length;
      const currentStress = session.currentStress;

      const userMistralKey = request.headers.get('x-mistral-api-key') || undefined;
      const response = await interrogate(
        session.caseData as Parameters<typeof interrogate>[0],
        session.conversationHistory,
        sanitized,
        questionCount,
        currentStress,
        session.learnedTactics,
        userMistralKey,
      );

      addMessage(session.id, 'user', sanitized);
      addMessage(session.id, 'assistant', (response.spoken_response as string) || '');

      // Clamp stress — max +2 per exchange
      const stressVal = response.stress_level as number;
      const clampedStress = Math.min(stressVal, currentStress + 2);
      response.stress_level = clampedStress;
      updateStress(session.id, clampedStress);

      // Block clue on opening message or if stress too low
      const isOpening = sanitized.startsWith('*');
      if (response.clue_unlocked && (isOpening || questionCount < 2 || clampedStress < 1)) {
        response.clue_unlocked = null;
      }

      if (response.clue_unlocked) {
        incrementClue(session.id);
      }
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
