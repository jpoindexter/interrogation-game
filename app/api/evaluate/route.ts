import { NextResponse } from 'next/server';
import { evaluateWin, generateLossSummary } from '../../../src/lib/mistral';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.type === 'win') {
      const result = await evaluateWin(
        body.caseData,
        body.conversationHistory || [],
        body.playerAccusation
      );
      return NextResponse.json(result);
    }

    if (body.type === 'lose') {
      const result = await generateLossSummary(
        body.caseData,
        body.conversationHistory || [],
        body.maxStress || 0
      );
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Error during evaluation:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate' },
      { status: 500 }
    );
  }
}
