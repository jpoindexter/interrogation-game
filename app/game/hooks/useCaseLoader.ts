import { useEffect, useEffectEvent, useState } from 'react';
import type { Case } from '@/lib/game-state';
import { readPreferences } from '../../settings/preferences-store';
import { recoverSession, type SessionSnapshot } from '../state/session-recovery';
import { CaseGenerationError } from '../state/case-loader';
import { loadCaseIntent } from '../state/load-case-intent';
import { acknowledgeGeneration, renewGeneration } from '../state/generation-receipt';
import type { CasePreparationPhase } from '../state/case-progress';

interface Options { difficulty: string; setting: string | null; mode?: string | null; sessionId?: string | null; onLoaded: (data: Case, snapshot?: SessionSnapshot) => void }

export function useCaseLoader({ difficulty, setting, mode, sessionId, onLoaded }: Options) {
  const [failure, setFailure] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [preparationPhase, setPreparationPhase] = useState<CasePreparationPhase>('preparing');
  const accept = useEffectEvent(onLoaded);
  useEffect(() => {
    const controller = new AbortController();
    const { timerMode, playMode } = readPreferences();
    const intent = { difficulty, setting, mode, timerMode, playMode };
    if (sessionId) acknowledgeGeneration(intent, sessionId);
    const request = sessionId
      ? recoverSession(sessionId, controller.signal).then(snapshot => ({ data: snapshot.caseData, snapshot }))
      : loadCaseIntent(intent, controller.signal, phase => { if (!controller.signal.aborted) setPreparationPhase(phase); });
    request.then(({ data, snapshot }) => { if (!controller.signal.aborted) accept(data, snapshot); })
      .catch(reason => {
        if (!controller.signal.aborted) setFailure(reason instanceof Error ? reason : new Error('Could not load the case. Retry the same request.'));
      });
    return () => controller.abort();
  }, [difficulty, setting, mode, sessionId, attempt]);
  const requiresNewAttempt = failure instanceof CaseGenerationError && failure.requiresNewAttempt;
  const retry = () => {
    try {
      if (requiresNewAttempt) {
        const { timerMode, playMode } = readPreferences();
        renewGeneration({ difficulty, setting, mode, timerMode, playMode }, failure.requestId);
      }
      setFailure(null);
      setPreparationPhase('preparing');
      setAttempt(value => value + 1);
    } catch (reason) { setFailure(reason instanceof Error ? reason : new Error('Could not prepare recovery.')); }
  };
  return { error: failure?.message ?? null, errorCode: failure instanceof CaseGenerationError ? failure.code : null,
    preparationPhase, retry, retryLabel: requiresNewAttempt ? 'Start new attempt' : 'Retry same request' };
}
