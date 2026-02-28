import { NextRequest, NextResponse } from 'next/server';
import { evaluateAccusation } from '../../../src/lib/mistral';

export async function POST(req: NextRequest) {
  try {
    const { caseData, conversationHistory, accusation } = await req.json();

    const result = await evaluateAccusation(caseData, conversationHistory, accusation);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error evaluating accusation:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate accusation' },
      { status: 500 }
    );
  }
}
