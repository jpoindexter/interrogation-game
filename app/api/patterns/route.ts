import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/db';
import { embedOne } from '@/lib/mistral/embeddings';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { getSession } from '@/lib/game-session';
import { sanitizeInput, validateDifficulty } from '@/lib/sanitize';

const ALLOWED_OUTCOMES = new Set(['win', 'lose_accusations', 'lose_time', 'lose_giveup']);
const MAX_QUESTIONS = 30;
const MAX_QUESTION_LEN = 500;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!rateLimit(ip, 5)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json();
    const { sessionId, setting, difficulty, outcome, questions, effectiveQuestions, maxStress, cluesFound, timeElapsed } = body;

    if (!sessionId || !setting || !difficulty || !outcome) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const validDifficulty = validateDifficulty(difficulty);
    if (!validDifficulty) return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 });
    if (!ALLOWED_OUTCOMES.has(outcome)) return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 });

    const safeQuestions = sanitizeQuestionArray(Array.isArray(questions) ? questions : []);
    const safeEffective = sanitizeQuestionArray(Array.isArray(effectiveQuestions) ? effectiveQuestions : []);
    const safeStress = Math.max(0, Math.min(9, Math.floor(Number(maxStress) || 0)));
    const safeClues = Math.max(0, Math.min(10, Math.floor(Number(cluesFound) || 0)));
    const safeTime = Math.max(0, Math.min(3600, Math.floor(Number(timeElapsed) || 0)));

    const summary = [
      `Setting: ${setting}`, `Difficulty: ${validDifficulty}`, `Outcome: ${outcome}`,
      `Questions: ${safeQuestions.join(' | ')}`,
      safeEffective.length > 0 ? `Effective: ${safeEffective.join(' | ')}` : '',
      `Stress: ${safeStress}/9`, `Clues: ${safeClues}`,
    ].filter(Boolean).join('\n');

    const embedding = await embedOne(summary);

    const { error } = await supabase.from('interrogation_patterns').upsert({
      session_id: sessionId,
      setting: String(setting).slice(0, 100),
      difficulty: validDifficulty,
      outcome,
      questions: safeQuestions,
      effective_questions: safeEffective,
      max_stress: safeStress,
      clues_found: safeClues,
      time_elapsed: safeTime,
      embedding: JSON.stringify(embedding),
    }, { onConflict: 'session_id' });

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

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!rateLimit(ip, 10)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const url = new URL(req.url);
    const difficulty = validateDifficulty(url.searchParams.get('difficulty'));
    if (!difficulty) return NextResponse.json({ tactics: [], totalGames: 0 });

    const setting = url.searchParams.get('setting');
    const queryText = `Setting: ${setting || 'any'}\nDifficulty: ${difficulty}\nOutcome: win\nEffective interrogation tactics`;
    const queryEmbedding = await embedOne(queryText);

    const { data, error } = await supabase.rpc('match_patterns', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: 0.5,
      match_count: 20,
      filter_difficulty: difficulty,
    });

    if (error) {
      console.error('Pattern retrieval error:', error);
      return NextResponse.json({ tactics: [], totalGames: 0 });
    }
    return buildResponse(data || []);
  } catch (err) {
    console.error('Pattern retrieval error:', err);
    return NextResponse.json({ tactics: [], totalGames: 0 });
  }
}

function sanitizeQuestionArray(arr: unknown[]): string[] {
  return arr
    .filter((q): q is string => typeof q === 'string' && q.length > 0)
    .slice(0, MAX_QUESTIONS)
    .map((q) => sanitizeInput(q.slice(0, MAX_QUESTION_LEN)));
}

function buildResponse(patterns: Array<{ effective_questions?: string[]; questions?: string[]; outcome?: string }>) {
  const wins = patterns.filter(p => p.outcome === 'win');
  if (wins.length === 0) return NextResponse.json({ tactics: [], totalGames: patterns.length });

  const freq = new Map<string, number>();
  for (const p of wins) {
    const qs = p.effective_questions?.length ? p.effective_questions : p.questions || [];
    for (const q of qs) {
      const n = q.toLowerCase().trim();
      if (n.length > 10) freq.set(n, (freq.get(n) || 0) + 1);
    }
  }

  const tactics = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([q]) => q);
  const winRate = Math.round((wins.length / patterns.length) * 100);
  return NextResponse.json({ tactics, totalGames: patterns.length, winRate });
}
