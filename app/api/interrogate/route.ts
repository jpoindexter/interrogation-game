import { NextRequest, NextResponse } from 'next/server';
import { interrogate } from '../../../src/lib/mistral';
import { sanitizeInput, validateString, isInjectionAttempt, isGibberish, isNonEnglish, containsSecretLeak } from '../../../src/lib/sanitize';
import { rateLimit, getClientIp } from '../../../src/lib/rate-limit';
import { getSession, addMessage, updateStress, updateHighStressStreak, incrementClue, acquireSessionLock, releaseSessionLock, DIFFICULTY_CLUES } from '../../../src/lib/game-session';

// Minimum questions before any clue can drop, by difficulty
const MIN_QUESTIONS_FOR_CLUES: Record<string, number> = {
  easy: 2, medium: 4, hard: 6, expert: 8,
};

// Minimum stress threshold for each clue number (1-indexed)
// e.g., clue 1 requires stress >= 2, clue 2 requires >= 4, etc.
function minStressForClue(clueNumber: number, totalClues: number): number {
  // Spread clue thresholds evenly across stress 2–8
  return Math.round(2 + ((clueNumber - 1) * 6) / Math.max(1, totalClues - 1));
}

// Short/lazy questions can't unlock clues — must show real investigative effort
const MIN_QUESTION_LENGTH_FOR_CLUE = 15;

// Server-side time limits (generous cap — prevents infinite play even if client is hacked)
const SERVER_TIME_LIMITS: Record<string, number> = {
  easy: 600, medium: 900, hard: 1200, expert: 1800,  // 2x client limits as grace
};
const NO_TIMER_CAP = 1800; // 30 min absolute cap for no-time-limit mode

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

    if (isNonEnglish(question)) {
      return NextResponse.json({
        spoken_response: "I don't understand what you're saying. Can you speak English, detective?",
        stress_level: session.currentStress,
        clue_unlocked: null,
        caught: false,
      });
    }

    // Server-side time enforcement — generous cap to prevent infinite play
    const elapsed = (Date.now() - session.startTime) / 1000;
    const difficulty = (session.caseData.difficulty as string) || 'medium';
    const serverCap = SERVER_TIME_LIMITS[difficulty] ?? NO_TIMER_CAP;
    if (elapsed > serverCap) {
      return NextResponse.json({
        spoken_response: "I think we're done here, detective. Time's up.",
        stress_level: session.currentStress,
        clue_unlocked: null,
        caught: false,
        timeExpired: true,
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

      // --- STRESS CLAMPING ---
      // Max +1 per exchange — suspect doesn't crack from a single question
      const stressVal = response.stress_level as number;
      const clampedStress = Math.min(stressVal, currentStress + 1);
      response.stress_level = clampedStress;
      updateStress(session.id, clampedStress);

      // --- CLUE GATING (server-enforced, AI cannot override) ---
      const maxClues = DIFFICULTY_CLUES[difficulty] || 3;
      const nextClueNumber = session.cluesCollected + 1;
      const minQuestions = MIN_QUESTIONS_FOR_CLUES[difficulty] ?? 4;
      const isOpening = sanitized.startsWith('*');
      const isLazyQuestion = sanitized.replace(/[^a-zA-Z]/g, '').length < MIN_QUESTION_LENGTH_FOR_CLUE;

      if (response.clue_unlocked) {
        const blocked =
          isOpening ||                                          // no clue on opening
          questionCount < minQuestions ||                        // not enough questions asked yet
          isLazyQuestion ||                                     // one-word / low-effort question
          nextClueNumber > maxClues ||                          // already collected all clues
          clampedStress < minStressForClue(nextClueNumber, maxClues);  // stress too low for this clue

        if (blocked) {
          response.clue_unlocked = null;
        }
      }

      if (response.clue_unlocked) {
        incrementClue(session.id);
      }

      // --- OUTPUT SCANNING: block responses that leak case secrets ---
      const caseSecrets = [
        session.caseData.the_lie as string,
        session.caseData.the_truth as string,
        session.caseData.the_contradiction as string,
      ].filter(Boolean);
      if (containsSecretLeak(response.spoken_response as string, caseSecrets)) {
        response.spoken_response = "I... I need a moment. Can we move on to something else?";
        // Don't let a leaked response also carry a clue
        if (response.clue_unlocked) response.clue_unlocked = null;
      }

      // --- LAWYER-UP: unlimited mode + hard/expert only ---
      // 4 consecutive exchanges at stress 8+ = suspect calls a lawyer and game ends
      const isUnlimitedMode = request.headers.get('x-timer-mode') === 'unlimited';
      const lawyerEligible = isUnlimitedMode && (difficulty === 'hard' || difficulty === 'expert');
      const lawyeredUp = lawyerEligible && updateHighStressStreak(session.id, clampedStress);

      if (lawyeredUp) {
        return NextResponse.json({
          ...response,
          spoken_response: "That's it. I'm done talking. I want my lawyer — now. This interview is over.",
          lawyered_up: true,
        });
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
