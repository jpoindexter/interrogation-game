import { useCallback } from 'react';
import type { ConversationMessage } from '@/lib/mistral';

/** Stores interrogation patterns for cross-session RAG learning. */
export function usePatterns(
  sessionId: string | undefined,
  setting: string | undefined,
  difficulty: string,
  elapsed: number,
) {
  return useCallback((outcome: string, history: ConversationMessage[], stress: number, clueCount: number) => {
    if (!sessionId) return;
    const questions: string[] = [];
    const effectiveQuestions: string[] = [];
    for (let i = 0; i < history.length; i++) {
      const m = history[i];
      if (m.role === 'user' && m.content && !m.content.startsWith('*') && !m.content.startsWith('[')) {
        questions.push(m.content);
        const next = history[i + 1];
        if (next?.role === 'assistant' && next.content) {
          effectiveQuestions.push(m.content);
        }
      }
    }
    fetch('/api/patterns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId, setting, difficulty, outcome,
        questions, effectiveQuestions,
        maxStress: stress, cluesFound: clueCount, timeElapsed: elapsed,
      }),
    }).catch(() => {});
  }, [sessionId, setting, difficulty, elapsed]);
}
