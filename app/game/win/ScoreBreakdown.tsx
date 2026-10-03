import { formatTime } from '../components/utils';
import { getDetectiveRating } from '../../../src/lib/scoring';
import { computeBreakdown } from '../result/score-breakdown';
import type { ResultStats } from '../result/types';

export default function ScoreBreakdown({ stats }: { stats: ResultStats }) {
  const breakdown = computeBreakdown(stats);
  const lines = [
    [breakdown.mode.timeAffectsScore ? 'Time score' : 'Base score',
      `${formatTime(stats.timeElapsed)} elapsed${breakdown.mode.timeAffectsScore === false ? ' · no time penalty' : ''}`,
      breakdown.timeScore === null ? 'Basis not recorded' : String(breakdown.timeScore)],
    ['Difficulty', breakdown.diff.label, `×${breakdown.diffMultiplier.toFixed(1)}`],
    ['Efficiency', `${stats.questionsAsked} questions`, `×${breakdown.efficiencyMultiplier.toFixed(2)}`],
    ['Hints used', String(stats.hintsUsed), stats.hintsUsed ? `−${Math.round((1 - breakdown.hintMultiplier) * 100)}%` : 'No penalty'],
    ['Wrong accusations', String(breakdown.wrongAccusations), breakdown.wrongAccusations ? `−${Math.round((1 - breakdown.accusationMultiplier) * 100)}%` : 'No penalty'],
  ];
  return <section aria-label="Score breakdown" className="bg-surface-dark/80 rounded-sm p-6 sm:p-8 mb-6">
    <h2 className="text-sm uppercase tracking-widest text-gray-200 mb-2">Score breakdown</h2>
    <p className="text-sm text-gray-300 mb-5">{breakdown.mode.label} · {breakdown.mode.ranking}</p>
    <dl className="space-y-4">
      {lines.map(([label, detail, value]) => <div key={label} className="flex gap-4 justify-between items-center">
        <dt>{label}<span className="block text-sm text-gray-300">{detail}</span></dt>
        <dd className="font-bold tabular-nums text-gold">{value}</dd>
      </div>)}
    </dl>
    <div className="border-t border-surface mt-5 pt-5 flex justify-between items-center">
      <p className="text-lg font-bold">Confirmed total</p>
      <p className="text-3xl font-bold text-gold tabular-nums">{stats.score.toLocaleString()}</p>
    </div>
    <p className="text-right text-gray-200 mt-1">{getDetectiveRating(stats.score)}</p>
  </section>;
}
