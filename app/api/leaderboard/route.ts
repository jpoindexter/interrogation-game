import { requestBudgetFailure } from '@/lib/limits/http';
import { NextRequest } from 'next/server';
import { getClientIp } from '@/lib/rate-limit';
import { getLeaderboardStore } from '@/lib/leaderboard/store';
import { leaderboardGet, leaderboardPost } from '@/lib/leaderboard/http';

export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  const budgetFailure = requestBudgetFailure(`leaderboard:read:${getClientIp(request)}`, 20);
  if (budgetFailure) return budgetFailure;
  return leaderboardGet({ request, store: getLeaderboardStore,
    allowed: () => true });
}
export async function POST(request: NextRequest) {
  const budgetFailure = requestBudgetFailure(`leaderboard:write:${getClientIp(request)}`, 10);
  if (budgetFailure) return budgetFailure;
  return leaderboardPost({ request, store: getLeaderboardStore,
    allowed: () => true });
}
