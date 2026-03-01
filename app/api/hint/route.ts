import { NextRequest, NextResponse } from 'next/server';
import { getSession, incrementHint, DIFFICULTY_CLUES } from '../../../src/lib/game-session';
import { rateLimit, getClientIp } from '../../../src/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (!rateLimit(ip, 10)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();

    const session = getSession(body.sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const stressTriggers = session.caseData.stress_triggers as string[] | undefined;
    if (!stressTriggers || !Array.isArray(stressTriggers)) {
      return NextResponse.json({ error: 'No hints available' }, { status: 404 });
    }

    const cluesNeeded = DIFFICULTY_CLUES[(session.caseData.difficulty as string) || 'medium'] || 3;
    const maxHints = Math.min(cluesNeeded, stressTriggers.length);

    if (session.hintsUsed >= maxHints) {
      return NextResponse.json({ error: 'All hints used' }, { status: 403 });
    }

    // Increment server-side hint count and return a THEMATIC nudge, not the raw trigger.
    // Raw stress triggers would give away exactly what to ask about.
    const newCount = incrementHint(session.id);
    const rawTrigger = stressTriggers[newCount - 1] ?? null;
    const hint = rawTrigger ? obfuscateHint(rawTrigger, newCount, maxHints) : null;

    return NextResponse.json({ hint, hintsUsed: newCount, maxHints });
  } catch (error) {
    console.error('Hint error:', error);
    return NextResponse.json({ error: 'Failed to retrieve hint' }, { status: 500 });
  }
}

/** Convert a raw stress trigger into a vaguer thematic nudge.
 *  Earlier hints are more vague; later hints are slightly more specific. */
function obfuscateHint(rawTrigger: string, hintNumber: number, totalHints: number): string {
  // Strip common prefixes like "questions about"
  const core = rawTrigger.replace(/^(questions?\s+about\s+|asking\s+about\s+|mentions?\s+of\s+)/i, '').trim();

  // Extract a thematic area — first 2-3 significant words
  const words = core.split(/\s+/).filter(w => w.length > 3);
  const isLast = hintNumber >= totalHints;

  if (words.length === 0) {
    return "Your detective instinct says something doesn't add up. Press harder.";
  }

  if (isLast) {
    // Final hint: slightly more specific — use 2-3 keywords
    const keywords = words.slice(0, 3).join(' ');
    return `Focus your questioning around: ${keywords}`;
  }

  // Earlier hints: vague thematic direction — use 1-2 keywords
  const keyword = words[0];
  const VAGUE_TEMPLATES = [
    `Something about "${keyword}" doesn't sit right. Dig deeper.`,
    `Your instinct says to look into anything involving "${keyword}".`,
    `There's a thread to pull on around "${keyword}". Follow it.`,
    `The case file has a note circled: "${keyword}". Worth exploring.`,
  ];
  return VAGUE_TEMPLATES[hintNumber % VAGUE_TEMPLATES.length];
}
