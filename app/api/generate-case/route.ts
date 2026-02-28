import { NextRequest, NextResponse } from 'next/server';
import { generateCase } from '../../../src/lib/mistral';
import { validateDifficulty, sanitizeInput } from '../../../src/lib/sanitize';
import { rateLimit } from '../../../src/lib/rate-limit';
import { createSession, sanitizeCaseForClient } from '../../../src/lib/game-session';

export const dynamic = 'force-dynamic';

// Whitelist of allowed settings to prevent prompt injection via query param
const ALLOWED_SETTINGS = new Set([
  'tech startup', 'bank', 'law firm', 'hospital', 'trading floor',
  'police station', 'server room',
]);

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!rateLimit(ip, 10)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const rawSetting = request.nextUrl.searchParams.get('setting') || undefined;
    // Only allow whitelisted settings — reject arbitrary user input
    const setting = rawSetting && ALLOWED_SETTINGS.has(rawSetting.toLowerCase())
      ? rawSetting : undefined;
    const difficulty = validateDifficulty(request.nextUrl.searchParams.get('difficulty')) || 'medium';
    const caseData = await generateCase(setting, difficulty);

    if (!caseData || !caseData.the_lie) {
      return NextResponse.json({ error: 'Failed to generate valid case' }, { status: 500 });
    }

    // Store full case data server-side, return only safe fields + session ID
    const sessionId = createSession(caseData);
    const clientData = sanitizeCaseForClient(caseData);

    return NextResponse.json({ ...clientData, sessionId });
  } catch (error) {
    console.error('Error generating case:', error);
    return NextResponse.json(
      { error: 'Failed to generate case' },
      { status: 500 }
    );
  }
}
