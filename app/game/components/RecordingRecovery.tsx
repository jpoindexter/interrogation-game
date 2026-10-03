import type { RecordingRecovery as RecoveryState } from '../audio/recorder-session';

export default function RecordingRecovery({ recovery, onRetry, onDiscard, disabled }: {
  recovery: RecoveryState | null;
  onRetry: () => void;
  onDiscard: () => void;
  disabled: boolean;
}) {
  if (!recovery) return null;
  return <section aria-label="Recording recovery" className="shrink-0 border-t border-gold/30 bg-surface-dark px-4 py-3 text-sm text-foreground">
    <p role="status">{recovery.message}</p>
    <p className="mt-1 text-gray-300">The clip stays in memory until you discard it, record again or leave this case.</p>
    {recovery.newAttemptRequired && <p className="mt-1 text-gold">The earlier attempt may have consumed provider usage. A new attempt can use more.</p>}
    <div className="mt-2 flex flex-wrap gap-3">
      <button type="button" disabled={disabled || recovery.busy} onClick={onRetry}
        className="min-h-11 border border-gold px-3 text-gold disabled:opacity-40">
        {recovery.newAttemptRequired ? 'Start new transcription attempt' : 'Retry transcription'}
      </button>
      <button type="button" onClick={onDiscard} className="min-h-11 px-3 underline">Discard recording</button>
    </div>
  </section>;
}
