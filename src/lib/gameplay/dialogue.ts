import { requireCondition } from './errors';
import type { DialogueAction, DialogueKind, PublicStatement } from './types';

export const DIALOGUE_OPTIONS: { kind: DialogueKind; label: string; description: string }[] = [
  { kind: 'clarify', label: 'Clarify', description: 'Ask for a more specific account.' },
  { kind: 'present_evidence', label: 'Present evidence', description: 'Ask how a statement fits an exhibit.' },
  { kind: 'leave_space', label: 'Leave space', description: 'Invite the suspect to continue their account.' },
];

export function draftDialogue(kind: DialogueKind, statement: PublicStatement): string {
  const questions = {
    clarify: 'Walk me through that in more detail.',
    present_evidence: 'How does that statement fit this evidence?',
    leave_space: 'What else do you remember about that?',
  };
  return `You said: “${statement.quote}” ${questions[kind]}`;
}

/** The HTTP boundary should call this parser; never spread the browser payload into state. */
export function parseDialogueAction(value: unknown): DialogueAction {
  requireCondition(value && typeof value === 'object' && !Array.isArray(value), 'INVALID_ACTION', 'Choose a dialogue action.');
  const raw = value as Record<string, unknown>;
  requireCondition(typeof raw.id === 'string' && /^[a-zA-Z0-9-]{8,80}$/.test(raw.id),
    'INVALID_ACTION', 'A stable action ID is required.');
  requireCondition(DIALOGUE_OPTIONS.some(option => option.kind === raw.kind), 'INVALID_ACTION', 'Unknown dialogue action.');
  requireCondition(typeof raw.statementId === 'string' && raw.statementId.length <= 120,
    'INVALID_ACTION', 'Select a statement.');
  requireCondition(typeof raw.question === 'string' && raw.question.trim().length > 0 && raw.question.length <= 2000,
    'INVALID_ACTION', 'Write a question of no more than 2000 characters.');
  const action: DialogueAction = { id: raw.id, kind: raw.kind as DialogueKind,
    statementId: raw.statementId, question: raw.question.trim() };
  if (action.kind === 'present_evidence') {
    requireCondition(typeof raw.exhibitId === 'string' && raw.exhibitId.length <= 80,
      'INVALID_ACTION', 'Select an exhibit to present.');
    action.exhibitId = raw.exhibitId;
  }
  return action;
}
