import { NextResponse } from 'next/server';
import supabase from '@/lib/db';
import { calculateScore, type Difficulty } from '@/lib/scoring';
import { validateString, validateNumber, validateDifficulty } from '@/lib/sanitize';

// GET — fetch top scores
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('player_name, case_setting, suspect_name, time_remaining, detective_rating, score, clues_found, hints_used, accusations_used, created_at')
      .order('score', { ascending: false })
      .limit(20);

    if (error) throw error;
    return NextResponse.json({ leaderboard: data ?? [] });
  } catch (error) {
    console.error('Leaderboard fetch error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}

// POST — submit a score
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const playerName = (validateString(body.playerName, 3) ?? 'DET').toUpperCase().slice(0, 3);
    const difficulty = validateDifficulty(body.difficulty) ?? 'medium';
    const timeElapsed = validateNumber(body.timeElapsed, 0, 7200) ?? 0;
    const hintsUsed = validateNumber(body.hintsUsed, 0, 10) ?? 0;
    const accusationsUsed = validateNumber(body.accusationsUsed, 0, 3) ?? 0;
    const stressLevel = validateNumber(body.stressLevel, 0, 10) ?? 0;
    const caseNumber = validateString(body.caseNumber, 100) ?? '';
    const caseSetting = validateString(body.caseSetting, 100) ?? '';
    const suspectName = validateString(body.suspectName, 100) ?? '';
    const detectiveRating = validateString(body.detectiveRating, 50) ?? 'Rookie';

    const score = calculateScore(
      timeElapsed,
      difficulty as Difficulty,
      hintsUsed,
      Math.max(0, accusationsUsed - 1),
    );

    const { data, error } = await supabase
      .from('leaderboard')
      .insert({
        player_name: playerName,
        case_number: caseNumber,
        case_setting: caseSetting,
        suspect_name: suspectName,
        time_remaining: timeElapsed,
        stress_level: stressLevel,
        clues_found: 0,
        hints_used: hintsUsed,
        accusations_used: accusationsUsed,
        detective_rating: detectiveRating,
        score,
      })
      .select('id, score')
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, id: data.id, score: data.score });
  } catch (error) {
    console.error('Leaderboard submit error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Failed to submit score' }, { status: 500 });
  }
}
