import { useCallback, useEffect, useState } from 'react';
import { useResultSource } from './use-result-source';
import { resultClient } from './result-client';
import { recordResult } from './history';
import type { Evaluation, ResultKind } from './types';

export function useResult(kind: ResultKind) {
  const source = useResultSource(kind);
  const { result } = source;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ key?: string; evaluation?: Evaluation; error?: string }>({});
  const key = `${kind}:${result?.sessionId}:${attempt}`;
  useEffect(() => {
    if (!result) return;
    let disposed = false;
    void resultClient.evaluate(result, kind).then(evaluation => {
      if (disposed) return;
      try { recordResult(result, evaluation, localStorage); } catch { /* Result remains usable when storage is unavailable. */ }
      setState({ key, evaluation });
    }).catch(() => {
      if (!disposed) setState({ key, error: 'The case debrief is unavailable. Retry when the server is ready; your transcript is still here.' });
    });
    return () => { disposed = true; };
  }, [result, kind, key]);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  return { ...source, result, evaluation: state.key === key ? state.evaluation : undefined,
    error: state.key === key ? state.error : undefined, retry };
}
