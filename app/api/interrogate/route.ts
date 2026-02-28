import { NextRequest, NextResponse } from 'next/server';
import { interrogate } from '../../../src/lib/mistral';
import { sanitizeInput, validateString, validateConversationHistory, validateCaseData } from '../../../src/lib/sanitize';
import { rateLimit } from '../../../src/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!rateLimit(ip, 30)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();

    const question = validateString(body.playerQuestion, 500);
    if (!question) {
      return NextResponse.json({ error: 'Question is required (max 500 chars)' }, { status: 400 });
    }

    const caseData = validateCaseData(body.caseData);
    if (!caseData) {
      return NextResponse.json({ error: 'Invalid case data' }, { status: 400 });
    }

    const history = validateConversationHistory(body.conversationHistory);
    const sanitized = sanitizeInput(question);

    const questionCount = typeof body.questionCount === 'number' ? Math.max(0, Math.floor(body.questionCount)) : undefined;
    const currentStress = typeof body.currentStress === 'number' ? Math.max(0, Math.min(10, body.currentStress)) : undefined;

    const response = await interrogate(caseData as Parameters<typeof interrogate>[0], history, sanitized, questionCount, currentStress);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error during interrogation:', error);
    return NextResponse.json(
      { error: 'Failed to process interrogation' },
      { status: 500 }
    );
  }
}
