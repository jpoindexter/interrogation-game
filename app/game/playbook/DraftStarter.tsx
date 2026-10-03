import type { DialogueKind, PublicStatement } from '@/lib/gameplay/client';
import type { PublicExhibit } from './types';

export function contextualStarter(kind: DialogueKind, statement: PublicStatement, exhibit?: PublicExhibit) {
  const source = statement.quote.length <= 1000 ? `You said: “${statement.quote}”` : 'About the statement pinned above:';
  if (kind === 'present_evidence') {
    if (!exhibit) return null;
    return `${source} How do you explain that account alongside “${exhibit.title}”? Which detail in the exhibit supports your explanation?`;
  }
  return kind === 'clarify'
    ? `${source} Walk me through the time, place and sequence of events. Which details are you certain about?`
    : `${source} Take a moment. What else do you remember about what happened immediately before or after that?`;
}

export default function DraftStarter({ kind, statement, exhibit, disabled, hasDraft, onUse }: {
  kind: DialogueKind;
  statement: PublicStatement | null;
  exhibit?: PublicExhibit;
  disabled: boolean;
  hasDraft: boolean;
  onUse: (question: string) => void;
}) {
  const starter = statement && contextualStarter(kind, statement, exhibit);
  if (!starter) return null;
  return (
    <details className="rounded-sm border border-stone-400 bg-[#f7f2e7] p-3">
      <summary className="cursor-pointer text-sm font-bold">Need a starting question?</summary>
      <p className="mt-3 text-sm leading-relaxed">{starter}</p>
      <button type="button" disabled={disabled} onClick={() => onUse(starter)}
        className="mt-3 min-h-11 rounded-sm border border-stone-700 px-3 py-2 text-sm font-bold disabled:opacity-50">
        {hasDraft ? 'Replace draft with this starter' : 'Use this starter'}
      </button>
      <p className="mt-2 text-xs">This only fills the draft. Review and edit it before sending.</p>
    </details>
  );
}
