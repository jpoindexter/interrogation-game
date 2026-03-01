import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';
import { calculateScore, getDetectiveRating, type Difficulty } from '@/lib/scoring';
import { validateString, validateDifficulty } from '@/lib/sanitize';
import { consumeWinToken, getSessionStats, getWinTokenStats } from '@/lib/game-session';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (!rateLimit(ip, 20)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = getSupabaseClient(request);
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

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (!rateLimit(ip, 5)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
    const winToken = typeof body.winToken === 'string' ? body.winToken : '';

    const tokenStats = getWinTokenStats(sessionId);
    const sessionStats = getSessionStats(sessionId);

    if (!sessionId || !winToken || !consumeWinToken(sessionId, winToken)) {
      return NextResponse.json({ error: 'Invalid or expired win token' }, { status: 401 });
    }

    const stats = tokenStats ?? sessionStats;
    if (!stats) {
      return NextResponse.json({ error: 'Session stats unavailable' }, { status: 400 });
    }

    const playerName = (validateString(body.playerName, 3) ?? 'DET').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3) || 'DET';
    const difficulty = (validateDifficulty(stats.difficulty) ?? 'medium') as Difficulty;
    const timeElapsed = stats.timeElapsed;
    const hintsUsed = stats.hintsUsed;
    const accusationsUsed = stats.accusationsUsed;
    const questionsAsked = stats.questionsAsked ?? 0;
    const stressLevel = Math.min(10, Math.max(0, Math.floor(body.stressLevel ?? 0)));
    const cluesFound = Math.min(10, Math.max(0, Math.floor(body.cluesFound ?? 0)));
    const caseNumber = validateString(body.caseNumber, 100) ?? '';
    const caseSetting = validateString(body.caseSetting, 100) ?? '';
    const suspectName = validateString(body.suspectName, 100) ?? '';

    const score = calculateScore(
      timeElapsed,
      difficulty,
      hintsUsed,
      Math.max(0, accusationsUsed - 1),
      questionsAsked,
    );
    const detectiveRating = getDetectiveRating(score);

    const supabase = getSupabaseClient(request);
    const { data, error } = await supabase
      .from('leaderboard')
      .insert({
        player_name: playerName,
        case_number: caseNumber,
        case_setting: caseSetting,
        suspect_name: suspectName,
        time_remaining: timeElapsed,
        stress_level: stressLevel,
        clues_found: cluesFound,
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
