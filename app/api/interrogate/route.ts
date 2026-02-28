import { NextResponse } from 'next/server';
import { interrogate } from '../../../src/lib/mistral';
import { sanitizeInput, validateString, validateConversationHistory } from '../../../src/lib/sanitize';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const question = validateString(body.playerQuestion, 500);
    if (!question) {
      return NextResponse.json({ error: 'Question is required (max 500 chars)' }, { status: 400 });
    }

    if (!body.caseData || typeof body.caseData !== 'object') {
      return NextResponse.json({ error: 'Invalid case data' }, { status: 400 });
    }

    const history = validateConversationHistory(body.conversationHistory);
    const sanitized = sanitizeInput(question);

    const response = await interrogate(body.caseData, history, sanitized);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error during interrogation:', error);
    return NextResponse.json(
      { error: 'Failed to process interrogation' },
      { status: 500 }
    );
  }
}
