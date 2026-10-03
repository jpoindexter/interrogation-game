import { motion, fadeUp, stagger, smooth } from '../components/motion';
import { formatTime } from '../game/components/utils';
import { rankBadge, type LeaderboardEntry } from './model';

function LeaderboardRow({ entry, index, isNew }: { entry: LeaderboardEntry; index: number; isNew: boolean }) {
  const rank = rankBadge(index);
  return <motion.tr variants={fadeUp} transition={smooth} className={isNew ? 'bg-gold/10' : 'bg-surface-dark'}>
    <td className={`p-4 font-bold ${rank.color}`}>{rank.label}</td>
    <td className="p-4 font-bold text-gold tracking-wider">
      {entry.player_name.slice(0, 3).toUpperCase()}
      {isNew && <span className="block text-xs font-normal text-gray-200">Your new score</span>}
    </td>
    <td className="p-4 max-w-64"><p className="font-bold truncate">{entry.suspect_name}</p>
      <p className="text-sm text-gray-300 truncate">{entry.case_setting}</p></td>
    <td className="p-4 text-right font-bold text-gold tabular-nums">{entry.score.toLocaleString()}</td>
    <td className="p-4 text-right tabular-nums text-gray-200">{formatTime(entry.time_remaining)}</td>
    <td className="p-4 text-right text-sm">{entry.detective_rating}</td>
  </motion.tr>;
}
export function LeaderboardTable({ entries, newEntryId }: { entries: LeaderboardEntry[]; newEntryId: string | null }) {
  return <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Top twenty scores, scroll horizontally on narrow screens">
    <table className="w-full min-w-[680px] border-separate border-spacing-y-2 text-sm">
      <caption className="text-left text-gray-300 pb-3">Top 20 recorded scores</caption>
      <thead><tr className="text-xs uppercase tracking-wider text-gray-300">
        {['Rank', 'Player', 'Case', 'Score', 'Time', 'Rating'].map(label => <th key={label} scope="col"
          className={`p-4 ${['Score', 'Time', 'Rating'].includes(label) ? 'text-right' : 'text-left'}`}>{label}</th>)}
      </tr></thead>
      <motion.tbody variants={stagger(0.04)} initial="hidden" animate="visible">
        {entries.map((entry, index) => <LeaderboardRow key={entry.id} entry={entry} index={index}
          isNew={newEntryId !== null && String(entry.id) === newEntryId} />)}
      </motion.tbody>
    </table>
  </div>;
}
