import { NextRequest, NextResponse } from 'next/server';
import { generateCase } from '../../../src/lib/mistral';
import { validateDifficulty } from '../../../src/lib/sanitize';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const setting = request.nextUrl.searchParams.get('setting') || undefined;
    const difficulty = validateDifficulty(request.nextUrl.searchParams.get('difficulty')) || 'medium';
    const caseData = await generateCase(setting, difficulty);

    if (!caseData || !caseData.the_lie) {
      return NextResponse.json({ error: 'Failed to generate valid case' }, { status: 500 });
    }

    return NextResponse.json(caseData);
  } catch (error) {
    console.error('Error generating case:', error);
    return NextResponse.json(
      { error: 'Failed to generate case' },
      { status: 500 }
    );
  }
}
