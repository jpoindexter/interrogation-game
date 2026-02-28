import { NextRequest, NextResponse } from 'next/server';
import { evaluateAccusation } from '../../../src/lib/mistral';
import { sanitizeInput, validateString, validateConversationHistory } from '../../../src/lib/sanitize';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const accusation = validateString(body.accusation, 1000);
    if (!accusation) {
      return NextResponse.json({ error: 'Accusation is required (max 1000 chars)' }, { status: 400 });
    }

    if (!body.caseData || typeof body.caseData !== 'object') {
      return NextResponse.json({ error: 'Invalid case data' }, { status: 400 });
    }

    const history = validateConversationHistory(body.conversationHistory);
    const sanitized = sanitizeInput(accusation);

    const result = await evaluateAccusation(body.caseData, history, sanitized);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error evaluating accusation:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate accusation' },
      { status: 500 }
    );
  }
}
