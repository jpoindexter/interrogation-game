export type LoadingPhase = 'preparing' | 'generating' | 'reviewing' | 'ready';

export const LOADING_STEPS: { phase: LoadingPhase; label: string }[] = [
  { phase: 'preparing', label: 'Prepare' },
  { phase: 'generating', label: 'Write case' },
  { phase: 'reviewing', label: 'Review' },
  { phase: 'ready', label: 'Ready' },
];

export function loadingTitle(phase?: LoadingPhase) {
  if (phase === 'generating') return 'Writing your case';
  if (phase === 'reviewing') return 'Reviewing the case file';
  if (phase === 'ready') return 'Your case is ready';
  return 'Preparing your case';
}

export function loadingMessage(phase: LoadingPhase | undefined, elapsed: number) {
  if (phase === 'ready') return 'Opening the briefing. Read the case before you begin.';
  if (elapsed >= 60) return 'This is taking longer than usual. The request is still pending; a result or recovery option will appear here.';
  if (elapsed >= 25) return 'Still waiting for the case. You do not need to refresh or start another request.';
  if (phase === 'reviewing') return 'Checking the case before it reaches your briefing.';
  if (phase === 'generating') return 'The AI is drafting the suspect’s account and case details.';
  return 'Waiting for the case server. The briefing will appear when the case is available.';
}

export function elapsedLabel(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  if (safe < 60) return `${safe}s elapsed`;
  return `${Math.floor(safe / 60)}m ${String(safe % 60).padStart(2, '0')}s elapsed`;
}
