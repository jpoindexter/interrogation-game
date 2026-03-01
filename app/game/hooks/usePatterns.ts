import { useCallback } from 'react';
import type { ConversationMessage } from '@/lib/mistral';
import { getUserApiHeaders } from '../../lib/api-keys';

/** Stores interrogation patterns for cross-session RAG learning. */
export function usePatterns(
  sessionId: string | undefined,
  setting: string | undefined,
  difficulty: string,
  elapsed: number,
) {
  return useCallback((outcome: string, history: ConversationMessage[], stress: number, clueCount: number) => {
    if (!sessionId) return;
    const userMessages = history.filter(
      m => m.role === 'user' && m.content && !m.content.startsWith('*') && !m.content.startsWith('['),
    );
    const questions = userMessages.map(m => m.content);
    // Effective = questions from the second half of conversation when stress reached 4+
    // These are the targeted questions that actually pressured the suspect
    const effectiveQuestions = stress >= 4
      ? userMessages.slice(Math.floor(userMessages.length / 2)).map(m => m.content)
      : [];
    fetch('/api/patterns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getUserApiHeaders() },
      body: JSON.stringify({
        sessionId, setting, difficulty, outcome,
        questions, effectiveQuestions,
        maxStress: stress, cluesFound: clueCount, timeElapsed: elapsed,
      }),
    }).catch(() => {});
  }, [sessionId, setting, difficulty, elapsed]);
}
