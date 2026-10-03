import { useEffect, useState } from 'react';
import { readLeaderboard, type LeaderboardEntry } from './model';
interface BoardState { attempt: number; entries: LeaderboardEntry[]; error?: string; newEntryId: string | null }
export function useLeaderboard() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<BoardState | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/leaderboard', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Leaderboard unavailable');
      return readLeaderboard(await response.json());
    }).then(entries => {
      if (controller.signal.aborted) return;
      let newEntryId: string | null = null;
      try {
        newEntryId = sessionStorage.getItem('newLeaderboardEntry');
        sessionStorage.removeItem('newLeaderboardEntry');
      } catch { /* The leaderboard remains readable without browser storage. */ }
      setState({ entries, newEntryId, attempt });
    }).catch(() => {
      if (!controller.signal.aborted) setState({ attempt, entries: [], newEntryId: null, error: 'The leaderboard is unavailable. Please retry.' });
    });
    return () => controller.abort();
  }, [attempt]);
  return { loading: state?.attempt !== attempt, entries: state?.entries ?? [], error: state?.error,
    newEntryId: state?.newEntryId ?? null, retry: () => setAttempt(value => value + 1) };
}
