import { NextResponse } from 'next/server';
import { generateCase } from '../../../src/lib/mistral';

export async function GET() {
  try {
    const caseData = await generateCase();
    return NextResponse.json(caseData);
  } catch (error) {
    console.error('Error generating case:', error);
    return NextResponse.json(
      { error: 'Failed to generate case' },
      { status: 500 }
    );
  }
}