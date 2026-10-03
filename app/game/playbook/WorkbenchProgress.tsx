import type { DialogueDraft } from './composer';
import type { PublicGameplayProjection } from './types';

export default function WorkbenchProgress({ projection }: { projection: PublicGameplayProjection }) {
  const count = projection.establishedCount;
  return (
    <p role="status" className="border-l-2 border-stone-600 pl-3 text-sm">
      <strong>{count} contradiction{count === 1 ? '' : 's'} established.</strong>{' '}
      {count > 0 ? 'Use the cited statement and exhibit when writing your accusation.' : 'Pin a reviewed statement and compare it with a disclosed exhibit.'}
    </p>
  );
}

export function nextDraftStep(draft: DialogueDraft, hasPin: boolean, projection: PublicGameplayProjection) {
  if (!hasPin) return 'First, pin a suspect statement above to attach its exact words.';
  if (draft.kind === 'present_evidence' && !projection.exhibits.some(exhibit => exhibit.id === draft.exhibitId)) {
    return 'Choose an exhibit above before sending this evidence question.';
  }
  return null;
}
