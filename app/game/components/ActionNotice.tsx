export interface ActionFeedback {
  message: string;
  tone: 'error' | 'info';
  recovery?: 'question';
}

export default function ActionNotice({ notice, onDismiss, onReviewQuestion }: {
  notice: ActionFeedback; onDismiss: () => void; onReviewQuestion?: () => void;
}) {
  return <div className="rounded border border-accent bg-surface-dark p-3 text-sm text-foreground">
    <p role={notice.tone === 'error' ? 'alert' : 'status'} aria-atomic="true">{notice.message}</p>
    <div className="mt-2 flex flex-wrap gap-2">
      {notice.recovery === 'question' && onReviewQuestion && <button type="button" onClick={onReviewQuestion}
        className="min-h-11 px-3 underline focus-visible:outline-2 focus-visible:outline-gold">Review question</button>}
      <button type="button" onClick={onDismiss}
        className="min-h-11 px-3 underline focus-visible:outline-2 focus-visible:outline-gold">Dismiss message</button>
    </div>
  </div>;
}
