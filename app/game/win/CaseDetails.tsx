import type { Evaluation } from '../result/types';
export default function CaseDetails({ suspectName, suspectRole, confession, evaluation }: {
  suspectName: string; suspectRole: string; confession?: string; evaluation: Evaluation;
}) {
  const facts = [
    ['The Lie', evaluation.reveal_the_lie], ['The Truth', evaluation.reveal_the_truth],
    ['The Contradiction', evaluation.reveal_the_clue],
  ];
  return <>
    {confession && <section className="bg-surface-dark/80 rounded-sm p-6 sm:p-8 mb-6">
      <h2 className="text-sm uppercase tracking-widest text-accent">{suspectName}</h2>
      <p className="text-sm text-gray-300 mb-3">{suspectRole}</p>
      <p className="text-base leading-relaxed italic">&ldquo;{confession}&rdquo;</p>
    </section>}
    <section aria-label="Recorded case facts" className="bg-surface-dark/80 rounded-sm p-6 sm:p-8 space-y-5">
      {facts.map(([label, fact]) => <div key={label}>
        <h3 className="text-sm uppercase tracking-widest text-gold mb-1">{label}</h3>
        <p className="text-base text-gray-200">{fact}</p>
      </div>)}
    </section>
  </>;
}
