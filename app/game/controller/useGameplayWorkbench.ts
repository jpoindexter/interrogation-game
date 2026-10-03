'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DialogueAction } from '@/lib/gameplay/client';
import type { PublicGameplayProjection } from '../playbook/types';
import { parseActionUpdate, parsePinUpdate, type GameplayUpdate } from '../playbook/response-parser';
import { GameplayRequestError, GameplayRequestSession } from '../playbook/request-session';
export type { GameplayUpdate, ActionUpdate, PinUpdate } from '../playbook/response-parser';

interface Options {
  sessionId: string | null;
  projection: PublicGameplayProjection | null;
  onUpdate: (update: GameplayUpdate) => void;
  disabled?: boolean;
}
interface RequestStatus { session: GameplayRequestSession; pending: boolean; error: string | null }

export function useGameplayWorkbench(options: Options) {
  const session = useMemo(() => new GameplayRequestSession(options.sessionId), [options.sessionId]);
  const [status, setStatus] = useState<RequestStatus | null>(null);
  useEffect(() => { session.activate(); return () => session.cancel(); }, [session]);
  const run = async <T extends GameplayUpdate>(body: object, parse: (value: unknown) => T): Promise<T> => {
    if (!options.sessionId || options.disabled || options.projection?.status !== 'active') throw new Error('This interrogation is not available.');
    if (session.busy) throw new Error('Wait for the current request to finish.');
    setStatus({ session, pending: true, error: null });
    try {
      const data = await session.post({ ...body, sessionId: options.sessionId });
      const update = parse(data);
      if (update.gameplay.caseId !== options.projection.caseId) throw new Error('The response belongs to another case.');
      options.onUpdate(update);
      setStatus({ session, pending: false, error: null });
      return update;
    } catch (cause) {
      const error = cause instanceof Error ? cause.message : 'The request failed. Your draft is preserved.';
      if (session.active) setStatus({ session, pending: false, error });
      throw cause;
    }
  };
  const onPin = async (source: { turnId: string; quote: string }) => {
    const intent = { kind: 'pin', ...source };
    const requestId = session.requestId(intent);
    try {
      const update = await run({ kind: 'pin', requestId, ...source }, value => parsePinUpdate(value, source));
      session.complete(intent);
      return update.statement;
    } catch (cause) {
      if (cause instanceof GameplayRequestError && cause.requiresNewAttempt) session.complete(intent);
      throw cause;
    }
  };
  const onAction = async (action: DialogueAction) => {
    const update = await run({ kind: 'action', requestId: action.id, action }, value => parseActionUpdate(value, action));
    return update.result;
  };
  return {
    projection: options.projection, onPin, onAction,
    pending: status?.session === session && status.pending,
    error: status?.session === session ? status.error : null,
  };
}
