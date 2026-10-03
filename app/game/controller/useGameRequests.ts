import { useCallback, useEffect, useRef, useMemo } from 'react';
import { RequestLedger } from '../state/request-ledger';
import { requestGameAction } from './action-transport';

export function useGameRequests(sessionId?: string) {
  const ledger = useMemo(() => new RequestLedger(), []);
  const pending = useRef<AbortController | null>(null);
  const cancelRequests = useCallback(() => { pending.current?.abort(); pending.current = null; }, []);
  useEffect(() => cancelRequests, [sessionId, cancelRequests]);
  const request = useCallback(async <T,>(path: string, body: Record<string, unknown>, parse: (value: unknown) => T): Promise<T> => {
    if (pending.current) throw new Error('Please wait for the current action.');
    const controller = new AbortController();
    pending.current = controller;
    const attempt = ledger.begin(path, body);
    try {
      return await requestGameAction({ path, body, attempt, signal: controller.signal, parse });
    } finally { if (pending.current === controller) pending.current = null; }
  }, [ledger]);
  return { request, cancelRequests };
}
