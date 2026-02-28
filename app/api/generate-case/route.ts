import { NextRequest, NextResponse } from 'next/server';
import { generateCase } from '../../../src/lib/mistral';

export async function GET(request: NextRequest) {
  try {
    const setting = request.nextUrl.searchParams.get('setting') || undefined;
    const caseData = await generateCase(setting);
    return NextResponse.json(caseData);
  } catch (error) {
    console.error('Error generating case:', error);
    return NextResponse.json(
      { error: 'Failed to generate case' },
      { status: 500 }
    );
  }
}