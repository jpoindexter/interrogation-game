import { NextRequest, NextResponse } from 'next/server';
import { generateCase } from '../../../src/lib/mistral';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const setting = request.nextUrl.searchParams.get('setting') || undefined;
    const difficulty = request.nextUrl.searchParams.get('difficulty') || 'medium';
    const caseData = await generateCase(setting, difficulty);
    return NextResponse.json(caseData);
  } catch (error) {
    console.error('Error generating case:', error);
    return NextResponse.json(
      { error: 'Failed to generate case' },
      { status: 500 }
    );
  }
}