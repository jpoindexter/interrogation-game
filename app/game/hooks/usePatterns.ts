import { useCallback } from 'react';
import type { ConversationMessage } from '@/lib/mistral';

/** Requests optional storage of the terminal server record. Disabled retrieval is a no-op. */
export function usePatterns(
  sessionId: string | undefined,
  _setting: string | undefined,
  _difficulty: string,
  _elapsed: number,
) {
  void [_setting, _difficulty, _elapsed]; // Preserve the existing controller signature during migration.
  return useCallback((_outcome: string, _history: ConversationMessage[], _stress: number, _clueCount: number) => {
    void [_outcome, _history, _stress, _clueCount];
    if (!sessionId) return;
    void fetch('/api/patterns', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }),
    }).catch(() => undefined);
  }, [sessionId]);
}
