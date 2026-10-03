import { useId, type Dispatch, type SetStateAction } from 'react';
import ActionNotice, { type ActionFeedback } from './ActionNotice';

interface QuestionFormProps {
  value: string;
  disabled: boolean;
  setValue: Dispatch<SetStateAction<string>>;
  onSubmit: (value: string) => boolean | Promise<boolean>;
  playKeystroke: () => void;
  onMic?: () => void;
  onClose?: () => void;
  feedback?: ActionFeedback | null;
  onDismissFeedback?: () => void;
}

const actionClass = 'min-h-11 px-4 py-2 text-sm rounded-lg border border-surface hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed';

export async function submitQuestionDraft({ value, disabled, setValue, onSubmit }: Pick<QuestionFormProps, 'value' | 'disabled' | 'setValue' | 'onSubmit'>) {
  if (!value.trim() || value.length > 500 || disabled) return;
  try {
    if (await onSubmit(value.trim())) setValue(current => current === value ? '' : current);
  } catch { /* The controller displays the error; keep the draft available for retry. */ }
}

export default function QuestionForm(props: QuestionFormProps) {
  const { value, disabled, setValue, playKeystroke, onClose } = props;
  const id = useId();
  return (
    <form onSubmit={event => { event.preventDefault(); void submitQuestionDraft(props); }}
      className="max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-xl border border-surface bg-surface-dark/95 p-4 shadow-2xl">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-bold text-foreground">Question the suspect</label>
        {onClose && <button type="button" onClick={onClose} className={actionClass}>Close</button>}
      </div>
      {props.feedback && props.onDismissFeedback && <ActionNotice notice={props.feedback} onDismiss={props.onDismissFeedback} />}
      <textarea id={id} value={value} rows={3} maxLength={500} disabled={disabled} autoFocus
        aria-describedby={`${id}-help ${id}-count`}
        onChange={event => { playKeystroke(); setValue(event.target.value); }}
        onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault(); event.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder="Ask about a detail, an alibi, or a piece of evidence…"
        className="mt-3 w-full resize-y rounded-lg border border-surface bg-black/30 p-3 text-sm text-foreground placeholder-gray-400 disabled:opacity-60" />
      <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-gray-400">
        <p id={`${id}-help`}>Enter to ask · Shift + Enter for a new line</p>
        <p id={`${id}-count`}>{value.length}/500 characters</p>
      </div>
      {value.length > 500 && <p role="status" className="mt-2 text-sm text-warn">
        Your question is {value.length - 500} characters too long. Shorten it before sending; your text is kept.
      </p>}
      <QuestionActions {...props} />
    </form>
  );
}

function QuestionActions({ value, disabled, onMic }: QuestionFormProps) {
  return (
    <div className="mt-3 flex flex-wrap justify-end gap-2">
      {onMic && <button type="button" onClick={onMic} disabled={disabled} className={actionClass}>Record a question</button>}
      <button type="submit" disabled={!value.trim() || value.length > 500 || disabled}
        className={`${actionClass} bg-accent text-white hover:bg-accent-hover`}>
        {disabled ? 'Waiting for response…' : 'Ask question'}
      </button>
    </div>
  );
}
