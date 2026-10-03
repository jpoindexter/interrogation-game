import { draftDialogue, type DialogueAction, type DialogueKind, type PublicStatement } from '@/lib/gameplay/client';
import type { PublicGameplayProjection } from './types';

export interface DialogueDraft {
  kind: DialogueKind;
  question: string;
  exhibitId: string;
}

export const EMPTY_DRAFT: DialogueDraft = { kind: 'clarify', question: '', exhibitId: '' };

export function chooseApproach(draft: DialogueDraft, kind: DialogueKind, statement: PublicStatement): DialogueDraft {
  return { ...draft, kind, question: draftDialogue(kind, statement) };
}

export function validateDraft(draft: DialogueDraft, statement: PublicStatement | null, projection: PublicGameplayProjection) {
  if (projection.status !== 'active') return 'This interrogation has ended.';
  if (!statement?.quote.trim()) return 'Pin a statement before preparing a question.';
  const turn = projection.turns.find(item => item.id === statement.turnId);
  if (!turn || !turn.answer.includes(statement.quote)) return 'The pinned source is no longer available.';
  if (!draft.question.trim()) return 'Write or choose a question.';
  if (draft.question.length > 2000) return 'Keep the question to 2000 characters or fewer.';
  if (draft.kind === 'present_evidence' && !projection.exhibits.some(item => item.id === draft.exhibitId)) {
    return 'Select an available exhibit to present.';
  }
  return null;
}

export function prepareDraftAction(draft: DialogueDraft, statement: PublicStatement, previous: DialogueAction | null,
  newId: () => string = () => crypto.randomUUID()): DialogueAction {
  const next = { kind: draft.kind, statementId: statement.id, question: draft.question.trim(),
    ...(draft.kind === 'present_evidence' ? { exhibitId: draft.exhibitId } : {}) };
  if (previous && previous.kind === next.kind && previous.statementId === next.statementId &&
    previous.question === next.question && previous.exhibitId === next.exhibitId) return previous;
  return { id: newId(), ...next };
}
