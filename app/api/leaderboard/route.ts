import { NextResponse } from 'next/server';
import sql from '@/lib/db';

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
      timeRemaining,
      stressLevel,
      cluesFound = 0,
      hintsUsed = 0,
      accusationsUsed = 0,
      detectiveRating,
    } = body;

    // Calculate score: time * 100 + clues * 200 - hints * 150 - extra accusations * 300
    const score = Math.max(0,
      timeRemaining * 100
      + cluesFound * 200
      - hintsUsed * 150
      - accusationsUsed * 300
    );

    const rows = await sql`
      INSERT INTO leaderboard (
        player_name, case_number, case_setting, suspect_name,
        time_remaining, stress_level, clues_found, hints_used, accusations_used,
        detective_rating, score
      ) VALUES (
        ${playerName}, ${caseNumber}, ${caseSetting}, ${suspectName},
        ${timeRemaining}, ${stressLevel}, ${cluesFound}, ${hintsUsed}, ${accusationsUsed},
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
