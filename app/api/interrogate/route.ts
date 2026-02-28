import { NextResponse } from 'next/server';
import { interrogate } from '../../../src/lib/mistral';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await interrogate(
      body.caseData,
      body.conversationHistory || [],
      body.playerQuestion
    );
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error during interrogation:', error);
    return NextResponse.json(
      { error: 'Failed to process interrogation' },
      { status: 500 }
    );
  }
}
