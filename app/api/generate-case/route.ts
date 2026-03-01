import { NextRequest, NextResponse } from 'next/server';
import { generateCase } from '../../../src/lib/mistral';
import { validateDifficulty, validateCaseData } from '../../../src/lib/sanitize';
import { rateLimit, getClientIp } from '../../../src/lib/rate-limit';
import { createSession, sanitizeCaseForClient } from '../../../src/lib/game-session';
import supabase from '../../../src/lib/db';
import { embedOne } from '../../../src/lib/mistral/embeddings';

export const dynamic = 'force-dynamic';

// Whitelist of allowed settings to prevent prompt injection via query param
const ALLOWED_SETTINGS = new Set([
  'tech startup', 'bank', 'law firm', 'hospital', 'trading floor',
  'police station', 'server room', 'startup', 'corporate office',
  'hospital or medical facility', 'bank or financial trading firm',
  'tech company', 'police precinct',
]);

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (!rateLimit(ip, 10)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const rawSetting = request.nextUrl.searchParams.get('setting') || undefined;
    const setting = rawSetting && ALLOWED_SETTINGS.has(rawSetting.toLowerCase())
      ? rawSetting : undefined;
    const difficulty = validateDifficulty(request.nextUrl.searchParams.get('difficulty')) || 'medium';
    const userMistralKey = request.headers.get('x-mistral-api-key') || undefined;
    const caseData = await generateCase(setting, difficulty, userMistralKey);

    if (!caseData || !caseData.the_lie) {
      return NextResponse.json({ error: 'Failed to generate valid case' }, { status: 500 });
    }

    const validatedCase = validateCaseData(caseData);
    if (!validatedCase) {
      return NextResponse.json({ error: 'Generated case failed validation' }, { status: 500 });
    }

    let learnedTactics: string[] = [];
    let totalPriorGames = 0;
    try {
      const queryText = `Setting: ${setting || 'any'}\nDifficulty: ${difficulty}\nEffective interrogation tactics`;
      const queryEmbedding = await embedOne(queryText, userMistralKey);
      const { data } = await supabase.rpc('match_patterns', {
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold: 0.5,
        match_count: 20,
        filter_difficulty: difficulty,
      });
      if (data && data.length > 0) {
        totalPriorGames = data.length;
        const wins = data.filter((p: { outcome?: string }) => p.outcome === 'win');
        const freq = new Map<string, number>();
        for (const p of wins) {
          const qs = (p.effective_questions?.length ? p.effective_questions : p.questions) || [];
          for (const q of qs) {
            const n = q.toLowerCase().trim();
            if (n.length > 10) freq.set(n, (freq.get(n) || 0) + 1);
          }
        }
        learnedTactics = [...freq.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([q]) => q);
      }
    } catch (err) {
      console.error('Pattern retrieval failed (non-fatal):', err);
    }

    const timerMode = request.headers.get('x-timer-mode') === 'unlimited' ? 'unlimited' as const : 'countdown' as const;
    const sessionId = createSession(validatedCase, learnedTactics, totalPriorGames, timerMode);
    const clientData = sanitizeCaseForClient(validatedCase);

    return NextResponse.json({ ...clientData, sessionId, priorGames: totalPriorGames });
  } catch (error) {
    console.error('Error generating case:', error);
    return NextResponse.json(
      { error: 'Failed to generate case' },
      { status: 500 }
    );
  }
}
