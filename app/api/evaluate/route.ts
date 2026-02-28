import { NextRequest, NextResponse } from 'next/server';
import { evaluateWin, generateLossSummary } from '../../../src/lib/mistral';
import { validateConversationHistory, validateNumber, validateCaseData, sanitizeInput } from '../../../src/lib/sanitize';
import { rateLimit } from '../../../src/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!rateLimit(ip, 30)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();

    if (!body.type || !['win', 'lose'].includes(body.type)) {
      return NextResponse.json({ error: 'Invalid evaluation type' }, { status: 400 });
    }

    const caseData = validateCaseData(body.caseData);
    if (!caseData) {
      return NextResponse.json({ error: 'Invalid case data' }, { status: 400 });
    }

    const history = validateConversationHistory(body.conversationHistory);

    if (body.type === 'win') {
      const accusation = typeof body.playerAccusation === 'string'
        ? sanitizeInput(body.playerAccusation.slice(0, 1000)) : '';
      const result = await evaluateWin(caseData as Parameters<typeof evaluateWin>[0], history, accusation);
      return NextResponse.json(result);
    }

    const maxStress = validateNumber(body.maxStress, 0, 10) ?? 0;
    const result = await generateLossSummary(caseData as Parameters<typeof generateLossSummary>[0], history, maxStress);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error during evaluation:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate' },
      { status: 500 }
    );
  }
}
