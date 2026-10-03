import type { CanonicalEnding } from './ending-result';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RequestLedger } from '../state/request-ledger';
import type { EndGameDeps } from './endgame-types';
import { EndRequestError, fetchEndRemark, playEndRemark, type EndRemark } from './end-remark';

function prepareExit(deps: EndGameDeps, options: EndRemark) {
  deps.sfx(options.sound);
  deps.setPhase('processing');
  if (deps.timerRef.current) clearInterval(deps.timerRef.current);
  deps.setLastTranscript(options.transcript);
  deps.setLastResponse('');
}

export function useEndRequest(deps: EndGameDeps, exit: (ending: CanonicalEnding) => void) {
  const [endGameError, setError] = useState<string | null>(null);
  const pending = useRef<AbortController | null>(null);
  const last = useRef<EndRemark | null>(null);
  const ledger = useMemo(() => new RequestLedger(), []);
  useEffect(() => () => pending.current?.abort(), [deps.caseData?.sessionId]);
  const acknowledgeError = (error: unknown, acknowledge: () => void) => {
    if (error instanceof EndRequestError && !error.retrySameId) acknowledge();
  };
  const run = async (options: EndRemark) => {
    if (!deps.caseData || pending.current) return;
    const controller = new AbortController();
    const attempt = ledger.begin('/api/session/end', { sessionId: deps.caseData.sessionId, reason: options.extra.gaveUp ? 'giveup' : 'time' });
    pending.current = controller;
    last.current = options;
    setError(null);
    prepareExit(deps, options);
    try {
      const ending = await fetchEndRemark(deps, options, controller.signal, attempt.id);
      attempt.acknowledge();
      if (controller.signal.aborted || await playEndRemark(deps, ending.remark) === 'cancelled') return;
      exit(ending);
    } catch (error) {
      if (controller.signal.aborted) return;
      acknowledgeError(error, attempt.acknowledge);
      setError('The ending could not be confirmed. Your case is preserved; retry to recover the result.');
      pending.current = null;
    }
  };
  return { run, endGameError, retryEnd: () => { if (last.current) void run(last.current); } };
}
