export type CasePreparationPhase = 'preparing' | 'generating' | 'reviewing' | 'ready';

/** Status polling only observes the saved request; it never creates or retries a case. */
export function watchCaseProgress(requestId: string, report?: (phase: CasePreparationPhase) => void) {
  if (!report) return () => {};
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const poll = async () => {
    try {
      const response = await fetch(`/api/generate-case/status?requestId=${encodeURIComponent(requestId)}`, {
        cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]),
      });
      const value = await response.json();
      if (!controller.signal.aborted && response.ok
        && ['preparing', 'generating', 'reviewing', 'ready'].includes(value?.phase)) report(value.phase);
    } catch { /* The main creation request owns failures; a missing status is not a failed case. */ }
    if (!controller.signal.aborted) timer = setTimeout(() => { void poll(); }, 1500);
  };
  timer = setTimeout(() => { void poll(); }, 500);
  return () => { controller.abort(); clearTimeout(timer); };
}
