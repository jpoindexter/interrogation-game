import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { calculateScore, type Difficulty } from '@/lib/scoring';

// GET — fetch top scores
export async function GET() {
  try {
    const rows = await sql`
      SELECT player_name, case_setting, suspect_name, time_remaining,
             detective_rating, score, clues_found, hints_used, accusations_used,
             created_at
      FROM leaderboard
      ORDER BY score DESC
      LIMIT 20
    `;
    return NextResponse.json({ leaderboard: rows });
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}

// POST — submit a score
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      playerName = 'Detective',
      caseNumber,
      caseSetting,
      suspectName,
      timeElapsed = 0,
      difficulty = 'medium',
      stressLevel,
      hintsUsed = 0,
      accusationsUsed = 0,
      detectiveRating,
    } = body;

    const score = calculateScore(
      timeElapsed,
      difficulty as Difficulty,
      hintsUsed,
      Math.max(0, accusationsUsed - 1), // only penalize WRONG accusations (subtract the winning one)
    );

    const rows = await sql`
      INSERT INTO leaderboard (
        player_name, case_number, case_setting, suspect_name,
        time_remaining, stress_level, clues_found, hints_used, accusations_used,
        detective_rating, score
      ) VALUES (
        ${playerName}, ${caseNumber}, ${caseSetting}, ${suspectName},
        ${timeElapsed}, ${stressLevel}, ${0}, ${hintsUsed}, ${accusationsUsed},
        ${detectiveRating}, ${score}
      )
      RETURNING id, score
    `;

    return NextResponse.json({ success: true, id: rows[0].id, score: rows[0].score });
  } catch (error) {
    console.error('Leaderboard submit error:', error);
    return NextResponse.json({ error: 'Failed to submit score' }, { status: 500 });
  }
}
