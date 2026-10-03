import type { DialogueResult, PublicStatement } from '@/lib/gameplay/client';
import type { PublicGameplayProjection } from './types';

const LABELS: Record<DialogueResult['status'], string> = {
  contradiction_established: 'Contradiction established',
  not_established: 'Contradiction not established',
  unreviewed_statement: 'Statement not reviewed',
  dialogue_only: 'Conversation continued',
};

export default function ChallengeFeedback({ result, projection, pinned, onSource }: {
  result: DialogueResult | null;
  projection: PublicGameplayProjection;
  pinned: PublicStatement | null;
  onSource: (id: string) => void;
}) {
  if (!result) return null;
  const statement = projection.statements.find(item => item.id === result.statementId) ??
    (pinned?.id === result.statementId ? pinned : null);
  const exhibit = projection.exhibits.find(item => item.id === result.exhibitId);
  return (
    <section aria-label="Accepted challenge result" className="space-y-3 border-t-2 border-stone-600 pt-4">
      <h3 role="status" className="text-sm font-bold uppercase tracking-wider">{LABELS[result.status]}</h3>
      <p className="text-sm leading-relaxed">{result.explanation}</p>
      {result.status === 'contradiction_established' && !result.progressAdded && <p className="text-sm">This evidence pair was already established. It has not counted twice.</p>}
      {statement && <div>
        <p className="text-xs font-bold uppercase">Statement cited</p>
        <blockquote className="mt-1 text-sm">{statement.quote}</blockquote>
        <button type="button" onClick={() => onSource(statement.turnId)} className="mt-1 text-sm underline underline-offset-2">View cited source</button>
      </div>}
      {exhibit && <p className="text-sm"><span className="font-bold">Exhibit cited:</span> {exhibit.title}</p>}
      <div className="border-l-2 border-stone-500 pl-3">
        <p className="text-xs font-bold uppercase">Suspect&apos;s accepted reply</p>
        <p className="mt-1 text-sm leading-relaxed">{result.answer}</p>
      </div>
      {result.status === 'contradiction_established' && <p className="text-sm">You can cite this pair in your accusation. You still write and submit the accusation yourself.</p>}
    </section>
  );
}
