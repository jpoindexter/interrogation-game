import type { Evaluation } from '../result/types';
import type { ConversationPathNode } from '../result/conversation-path';

export default function CaseDetails({ suspectName, suspectRole, confession, evaluation, accepted, onOpenExchange }: {
  suspectName: string; suspectRole: string; confession?: string; evaluation: Evaluation;
  accepted?: ConversationPathNode; onOpenExchange: () => void;
}) {
  return <>
    <section aria-label="Recorded case reasoning" className="bg-surface-dark/80 rounded-sm p-5 sm:p-6 space-y-4 mb-6">
      <h2 className="text-sm uppercase tracking-widest text-gold font-bold">The case, explained</h2>
      <div>
        <h3 className="text-xs uppercase tracking-wider text-gray-300 mb-1">Your accepted accusation</h3>
        <p className="text-sm leading-relaxed">{accepted?.question || 'The accepted accusation was not recorded in this result. The canonical case facts are shown below.'}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 border-y border-white/15 py-4">
        <div><h3 className="text-xs uppercase tracking-wider text-accent mb-1">The false claim</h3>
          <p className="text-sm leading-relaxed text-gray-200">{evaluation.reveal_the_lie}</p></div>
        <div><h3 className="text-xs uppercase tracking-wider text-gold mb-1">The verified truth</h3>
          <p className="text-sm leading-relaxed text-gray-200">{evaluation.reveal_the_truth}</p></div>
      </div>
      <div><h3 className="text-xs uppercase tracking-wider text-gold mb-1">The contradiction</h3>
        <p className="text-sm leading-relaxed text-gray-200">{evaluation.reveal_the_clue}</p></div>
      <div><h3 className="text-xs uppercase tracking-wider text-gold mb-1">Recorded judge rationale</h3>
        <p className="text-sm leading-relaxed text-gray-200">{accepted?.explanation?.trim()
          ? accepted.explanation : 'The judge’s explanation was not recorded for this result.'}</p></div>
      {accepted && <button type="button" onClick={onOpenExchange}
        className="min-h-11 text-sm text-gold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">
        View recorded exchange
      </button>}
    </section>
    {confession && <details className="bg-surface-dark/80 rounded-sm p-5 sm:p-6 mb-6">
      <summary className="cursor-pointer text-sm text-accent focus-visible:outline-2 focus-visible:outline-gold">{suspectName}’s recorded confession</summary>
      <p className="text-sm text-gray-300 mt-3 mb-2">{suspectRole}</p>
      <p className="text-sm leading-relaxed italic">&ldquo;{confession}&rdquo;</p>
    </details>}
  </>;
}
