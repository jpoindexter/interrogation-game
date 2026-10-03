import type { Evaluation, GameResult } from '../result/types';
import { resultModePresentation } from '../result/mode-presentation';
import { lossPresentation } from '../result/loss-presentation';

export function LossDetails({ result, evaluation }: { result: GameResult; evaluation: Evaluation }) {
  const mode = resultModePresentation(evaluation.stats);
  const presentation = lossPresentation(result, evaluation);
  const facts = [['The Lie', evaluation.the_lie_revealed], ['The Truth', evaluation.the_truth_revealed],
    ['The Contradiction', evaluation.what_they_missed], ['Recorded evidence', evaluation.closest_moment]];
  const remark = result.timeUpRemark || result.cleverRemark;
  return <>
    <section className="bg-surface-dark/80 rounded-sm p-6 sm:p-8 mb-6">
      <h2 className="text-sm uppercase tracking-widest text-gray-200 mb-3">Case summary</h2>
      <p className="text-sm text-gray-300 mb-3">{mode.label} · {mode.ranking}</p>
      <dl className="space-y-3">
        <div className="flex justify-between gap-4"><dt>Outcome</dt><dd className="font-bold text-accent">{presentation.label}</dd></div>
        <div className="flex justify-between gap-4"><dt>Difficulty</dt><dd className="capitalize">{evaluation.stats.difficulty}</dd></div>
      </dl>
    </section>
    {remark && <section className="bg-surface-dark/80 rounded-sm p-6 sm:p-8 mb-6">
      <h2 className="text-sm uppercase tracking-widest text-accent mb-1">{result.caseData.suspect_name}</h2>
      <p className="text-sm text-gray-300 mb-3">{result.caseData.suspect_role}</p>
      <p className="italic leading-relaxed">&ldquo;{remark}&rdquo;</p>
    </section>}
    <section aria-label="Recorded case facts" className="bg-surface-dark/80 rounded-sm p-6 sm:p-8 space-y-5">
      {facts.map(([label, fact]) => <div key={label}>
        <h3 className="text-sm uppercase tracking-widest text-gold mb-1">{label}</h3>
        <p className="text-base text-gray-200">{fact}</p>
      </div>)}
    </section>
  </>;
}
