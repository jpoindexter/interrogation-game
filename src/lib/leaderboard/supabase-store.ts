import type { SupabaseClient } from '@supabase/supabase-js';
import { publicLeaderboardRow, type LeaderboardRow, type LeaderboardStore } from './types';

export class SupabaseLeaderboardStore implements LeaderboardStore {
  constructor(private readonly client: SupabaseClient) {}
  async find(sessionId: string): Promise<LeaderboardRow | null> {
    const { data, error } = await this.client.from('leaderboard').select('*').eq('session_id', sessionId).maybeSingle();
    if (error) throw new Error('Leaderboard lookup failed');
    return data as LeaderboardRow | null;
  }
  async insert(row: LeaderboardRow): Promise<LeaderboardRow> {
    const { error } = await this.client.from('leaderboard').upsert(row, { onConflict: 'session_id', ignoreDuplicates: true });
    if (error) throw new Error('Leaderboard write failed');
    const saved = await this.find(row.session_id);
    if (!saved) throw new Error('Leaderboard write was not confirmed');
    return saved;
  }
  async list() {
    const { data, error } = await this.client.from('leaderboard').select('*').eq('ranked', true).eq('play_mode', 'challenge').order('score', { ascending: false }).limit(20);
    if (error) throw new Error('Leaderboard lookup failed');
    return (data as LeaderboardRow[]).map(publicLeaderboardRow);
  }
}
