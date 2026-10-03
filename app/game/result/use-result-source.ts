import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useBrowserStorage } from '../../components/useBrowserStorage';
import { readGameResult } from './validation';
import { recoverResult } from './recover-result';
import type { GameResult, ResultKind } from './types';

function subscribe(listener: () => void) {
  window.addEventListener('popstate', listener);
  return () => window.removeEventListener('popstate', listener);
}
function recoveryId() { return new URLSearchParams(window.location.search).get('session'); }

/** URL-backed results survive blocked/quota-exhausted browser storage. */
export function useResultSource(kind: ResultKind) {
  const raw = useBrowserStorage('gameResult', 'session');
  const saved = useMemo(() => readGameResult(raw), [raw]);
  const id = useSyncExternalStore(subscribe, recoveryId, () => null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ key?: string; result?: GameResult; error?: string }>({});
  const key = `${id}:${kind}:${attempt}`;
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    void recoverResult(id, kind, controller.signal).then(result => {
      if (!controller.signal.aborted) setState({ key, result });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ key, error: error instanceof Error ? error.message : 'Could not recover the result.' });
    });
    return () => controller.abort();
  }, [id, kind, key]);
  const retryRecovery = useCallback(() => setAttempt(value => value + 1), []);
  const active = state.key === key ? state : {};
  return { result: id ? active.result : saved,
    recoveryPending: Boolean(id && !active.result && !active.error), recoveryError: active.error, retryRecovery };
}
