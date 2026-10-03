import { requestBudgetFailure } from '@/lib/limits/http';
import { NextRequest } from 'next/server';
import { getClientIp } from '@/lib/rate-limit';
import { getLeaderboardStore } from '@/lib/leaderboard/store';
import { leaderboardGet, leaderboardPost } from '@/lib/leaderboard/http';
import { hostedStores, storageBackend } from '@/lib/storage/backend';
import { LeaderboardError } from '@/lib/leaderboard/types';

export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  const budgetFailure = await requestBudgetFailure(`leaderboard:read:${getClientIp(request)}`, 20);
  if (budgetFailure) return budgetFailure;
  return leaderboardGet({ request, store: getLeaderboardStore,
    allowed: () => true });
}
export async function POST(request: NextRequest) {
  const budgetFailure = await requestBudgetFailure(`leaderboard:write:${getClientIp(request)}`, 10);
  if (budgetFailure) return budgetFailure;
  if (storageBackend() === 'supabase') return hostedSubmission(request);
  return leaderboardPost({ request, store: getLeaderboardStore,
    allowed: () => true });
}

async function hostedSubmission(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  try {
    const result = await hostedStores().redemption.redeem(body);
    if (result.kind === 'redeemed' || result.kind === 'replay') return Response.json(result.receipt);
    const status = result.kind === 'invalid' || result.kind === 'unavailable' ? 401 : 409;
    return Response.json({ error: result.kind === 'busy' ? 'Another action is in progress. Retry this score submission.'
      : 'This score could not be redeemed with those initials and credentials.', code: `SCORE_${result.kind.toUpperCase()}` }, { status });
  } catch (error) {
    if (error instanceof LeaderboardError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: 'Score save could not be confirmed. Retry the same submission.', code: 'STORAGE_UNAVAILABLE' }, { status: 503 });
  }
}
