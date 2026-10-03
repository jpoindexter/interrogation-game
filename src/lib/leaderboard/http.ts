import { redeemWin } from './redemption';
import { LeaderboardError, type LeaderboardStore } from './types';

interface RequestContext { request: Request; store: () => LeaderboardStore; allowed: () => boolean }
export async function leaderboardGet(context: RequestContext): Promise<Response> {
  if (!context.allowed()) return Response.json({ error: 'Too many requests' }, { status: 429 });
  try { return Response.json({ leaderboard: await context.store().list() }); }
  catch { return Response.json({ error: 'Leaderboard storage unavailable or not configured' }, { status: 503 }); }
}
export async function leaderboardPost(context: RequestContext): Promise<Response> {
  if (!context.allowed()) return Response.json({ error: 'Too many requests' }, { status: 429 });
  let body: unknown;
  try { body = await context.request.json(); } catch { return Response.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  try { return Response.json(await redeemWin(body, context.store())); }
  catch (error) {
    if (error instanceof LeaderboardError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: 'Score save could not be confirmed. Retry safely when storage is available.' }, { status: 503 });
  }
}
