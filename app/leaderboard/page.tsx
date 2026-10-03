'use client';
import { BackButton, PageShell, PageHeader, Spinner } from '../components/ui';
import { PageMotion } from '../components/motion';
import { LeaderboardTable } from './LeaderboardTable';
import { useLeaderboard } from './useLeaderboard';

function BoardContent({ board }: { board: ReturnType<typeof useLeaderboard> }) {
  if (board.loading) return <div role="status" aria-label="Loading leaderboard" className="flex justify-center py-20"><Spinner /></div>;
  if (board.error) return <div role="alert" className="text-center py-20 text-gray-200">
    <p>{board.error}</p><button onClick={board.retry} className="text-gold underline mt-4">Retry leaderboard</button>
  </div>;
  if (!board.entries.length) return <div className="text-center py-20 text-gray-200">
    <p className="text-lg mb-2">No recorded scores yet.</p><p>Solve a case and choose Save to leaderboard.</p>
  </div>;
  return <><LeaderboardTable entries={board.entries} newEntryId={board.newEntryId} />
    <aside aria-label="Scoring rules" className="mt-10 p-4 bg-surface-darker border border-surface-dark rounded-sm text-gray-300">
      <h2 className="text-sm uppercase tracking-wider mb-3">Scoring</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <span>Speed × difficulty</span><span>Efficiency bonus</span><span>Hints −15% each</span><span>Wrong accusation −10% each</span>
      </div>
    </aside></>;
}
export default function LeaderboardPage() {
  const board = useLeaderboard();
  return <PageShell><BackButton /><PageMotion><div className="max-w-4xl mx-auto px-6 py-12">
    <PageHeader label="Hall of Records" title="LEADERBOARD" /><BoardContent board={board} />
  </div></PageMotion></PageShell>;
}
