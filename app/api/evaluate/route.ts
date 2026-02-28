import { NextResponse } from 'next/server';
import { evaluateWin, generateLossSummary } from '../../../src/lib/mistral';
import { validateConversationHistory, validateNumber } from '../../../src/lib/sanitize';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.type || !['win', 'lose'].includes(body.type)) {
      return NextResponse.json({ error: 'Invalid evaluation type' }, { status: 400 });
    }

    if (!body.caseData || typeof body.caseData !== 'object') {
      return NextResponse.json({ error: 'Invalid case data' }, { status: 400 });
    }

    const history = validateConversationHistory(body.conversationHistory);

    if (body.type === 'win') {
      const result = await evaluateWin(body.caseData, history, body.playerAccusation);
      return NextResponse.json(result);
    }

    const maxStress = validateNumber(body.maxStress, 0, 10) ?? 0;
    const result = await generateLossSummary(body.caseData, history, maxStress);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error during evaluation:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate' },
      { status: 500 }
    );
  }
}
