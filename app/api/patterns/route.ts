import { NextResponse } from 'next/server';
import supabase from '@/lib/db';
import { embedOne } from '@/lib/mistral/embeddings';

/**
 * POST /api/patterns — store interrogation patterns after a game ends
 * Body: { sessionId, setting, difficulty, outcome, questions, effectiveQuestions, maxStress, cluesFound, timeElapsed }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      sessionId, setting, difficulty, outcome,
      questions = [], effectiveQuestions = [],
      maxStress = 0, cluesFound = 0, timeElapsed = 0,
    } = body;

    if (!sessionId || !setting || !difficulty || !outcome) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Build a text summary for embedding
    const summary = [
      `Setting: ${setting}`,
      `Difficulty: ${difficulty}`,
      `Outcome: ${outcome}`,
      `Questions asked: ${questions.join(' | ')}`,
      effectiveQuestions.length > 0
        ? `Effective questions (triggered clues/stress): ${effectiveQuestions.join(' | ')}`
        : '',
      `Max stress reached: ${maxStress}/9`,
      `Clues found: ${cluesFound}`,
    ].filter(Boolean).join('\n');

    // Generate embedding
    const embedding = await embedOne(summary);

    const { error } = await supabase.from('interrogation_patterns').insert({
      session_id: sessionId,
      setting,
      difficulty,
      outcome,
      questions,
      effective_questions: effectiveQuestions,
      max_stress: maxStress,
      clues_found: cluesFound,
      time_elapsed: timeElapsed,
      embedding: JSON.stringify(embedding),
    });

    if (error) {
      console.error('Failed to store pattern:', error);
      return NextResponse.json({ error: 'Failed to store' }, { status: 500 });
    }

    return NextResponse.json({ stored: true });
  } catch (err) {
    console.error('Pattern storage error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * GET /api/patterns?setting=...&difficulty=... — retrieve learned patterns for case generation
 * Returns top tactics players have used, for injecting into suspect AI prompt
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const setting = url.searchParams.get('setting');
    const difficulty = url.searchParams.get('difficulty');

    if (!setting || !difficulty) {
      return NextResponse.json({ error: 'Missing setting or difficulty' }, { status: 400 });
    }

    // Build query text for similarity search
    const queryText = `Setting: ${setting}\nDifficulty: ${difficulty}\nOutcome: win\nEffective interrogation tactics`;
    const queryEmbedding = await embedOne(queryText);

    // Vector similarity search — find winning patterns for similar settings
    const { data, error } = await supabase.rpc('match_patterns', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: 0.3,
      match_count: 20,
      filter_difficulty: difficulty,
    });

    if (error) {
      console.error('Pattern retrieval error:', error);
      // Fallback: simple query without vector search
      const fallback = await supabase
        .from('interrogation_patterns')
        .select('effective_questions, questions, outcome, max_stress')
        .eq('difficulty', difficulty)
        .order('created_at', { ascending: false })
        .limit(20);

      return buildResponse(fallback.data || []);
    }

    return buildResponse(data || []);
  } catch (err) {
    console.error('Pattern retrieval error:', err);
    return NextResponse.json({ tactics: [], totalGames: 0 });
  }
}

function buildResponse(patterns: Array<{ effective_questions?: string[]; questions?: string[]; outcome?: string; max_stress?: number }>) {
  const totalGames = patterns.length;
  if (totalGames === 0) return NextResponse.json({ tactics: [], totalGames: 0 });

  // Aggregate effective questions across all matched games
  const questionFreq = new Map<string, number>();
  for (const p of patterns) {
    const qs = p.effective_questions?.length ? p.effective_questions : p.questions || [];
    for (const q of qs) {
      const normalized = q.toLowerCase().trim();
      if (normalized.length > 10) {
        questionFreq.set(normalized, (questionFreq.get(normalized) || 0) + 1);
      }
    }
  }

  // Sort by frequency, take top 8 tactics
  const tactics = [...questionFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([q]) => q);

  const winRate = patterns.filter(p => p.outcome === 'win').length / totalGames;

  return NextResponse.json({ tactics, totalGames, winRate: Math.round(winRate * 100) });
}
