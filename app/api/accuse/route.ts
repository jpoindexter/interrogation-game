import { NextRequest, NextResponse } from 'next/server';
import { evaluateAccusation } from '../../../src/lib/mistral';
import { sanitizeInput, validateString, validateConversationHistory, validateCaseData } from '../../../src/lib/sanitize';
import { rateLimit } from '../../../src/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!rateLimit(ip, 30)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json();

    const accusation = validateString(body.accusation, 1000);
    if (!accusation) {
      return NextResponse.json({ error: 'Accusation is required (max 1000 chars)' }, { status: 400 });
    }

    const caseData = validateCaseData(body.caseData);
    if (!caseData) {
      return NextResponse.json({ error: 'Invalid case data' }, { status: 400 });
    }

    const history = validateConversationHistory(body.conversationHistory);
    const sanitized = sanitizeInput(accusation);

    const result = await evaluateAccusation(caseData as Parameters<typeof evaluateAccusation>[0], history, sanitized);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error evaluating accusation:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate accusation' },
      { status: 500 }
    );
  }
}
