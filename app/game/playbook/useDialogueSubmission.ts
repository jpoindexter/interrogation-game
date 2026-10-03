import { useRef, useState } from 'react';
import type { DialogueAction, DialogueResult, PublicStatement } from '@/lib/gameplay/client';
import { prepareDraftAction, validateDraft, type DialogueDraft } from './composer';
import type { EvidenceWorkbenchProps } from './types';
import { dialogueFailure } from './request-session';

export function useDialogueSubmission(props: EvidenceWorkbenchProps, draft: DialogueDraft, pinned: PublicStatement | null) {
  const request = useRef<DialogueAction | null>(null);
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DialogueResult | null>(null);
  const submit = async () => {
    if (inFlight.current || props.disabled) return;
    const problem = validateDraft(draft, pinned, props.publicProjection);
    if (problem || !pinned) { setError(problem); return; }
    const action = prepareDraftAction(draft, pinned, request.current);
    request.current = action;
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      const accepted = await props.onAction(action);
      if (accepted.actionId !== action.id || accepted.statementId !== action.statementId || accepted.exhibitId !== action.exhibitId) {
        throw new Error('The response did not match the submitted sources.');
      }
      request.current = null;
      setResult(accepted);
    } catch (cause) {
      const failure = dialogueFailure(cause);
      if (failure.requiresNewAttempt) request.current = null;
      setError(failure.message);
    }
    finally { inFlight.current = false; setPending(false); }
  };
  return { pending, error, result, submit };
}
