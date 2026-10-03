import type { DialogueDraft } from './composer';

export default function QuestionComposer({ draft, disabled, pending, requiredStep, onChange, onSubmit, onCancel }: {
  draft: DialogueDraft;
  disabled: boolean;
  pending: boolean;
  requiredStep?: string | null;
  onChange: (question: string) => void;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
}) {
  return (
    <form className="space-y-2" onSubmit={event => { event.preventDefault(); void onSubmit(); }}>
      <label htmlFor="playbook-question" className="block text-sm font-bold">Review and edit your question</label>
      <textarea id="playbook-question" rows={4} maxLength={2000} value={draft.question} disabled={disabled}
        aria-describedby="playbook-question-help" onChange={event => onChange(event.target.value)}
        className="w-full resize-y rounded-sm border border-stone-500 bg-[#f7f2e7] p-3 text-sm leading-relaxed disabled:opacity-60" />
      <p id="playbook-question-help" className="text-sm">This sends your edited question with the pinned quote{draft.kind === 'present_evidence' ? ' and selected exhibit' : ''}. Your usual text and voice controls remain available.</p>
      <p className="text-sm font-bold">{draft.kind === 'present_evidence'
        ? 'This checks the selected statement and exhibit pair. It does not submit an accusation.'
        : 'This continues the conversation. It does not establish a contradiction on its own.'}</p>
      {requiredStep && <p id="playbook-required-step" className="text-sm font-bold text-[#772323]">{requiredStep}</p>}
      <p className="text-right text-xs">{draft.question.length}/2000 characters</p>
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={disabled || Boolean(requiredStep) || !draft.question.trim()} aria-describedby={requiredStep ? 'playbook-required-step' : undefined} className="min-h-11 rounded-sm bg-[#772323] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
          {pending ? 'Waiting for the suspect…' : draft.kind === 'present_evidence' ? 'Ask with this evidence' : 'Ask this question'}
        </button>
        <button type="button" disabled={disabled} onClick={onCancel} className="min-h-11 rounded-sm border border-stone-600 px-3 py-2 text-sm disabled:opacity-50">Cancel draft</button>
      </div>
    </form>
  );
}
