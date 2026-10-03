import type { GameSession } from '../../session/types';
import { AiError } from '../contracts';
import { EMBEDDING_SPACE } from './config';

export function canonicalPattern(session: GameSession) {
  if (!session.outcome || !session.endedAt || !['won', 'lost'].includes(session.status)) {
    throw new AiError('SESSION_UNFINISHED', 'Only a completed server session can contribute a pattern.');
  }
  const questions = session.conversationHistory
    .filter(message => message.role === 'user' && message.kind === 'question' && !message.content.startsWith('*'))
    .slice(0, 30).map(message => message.content.slice(0, 300));
  return {
    session_id: session.id, setting: String(session.caseData.setting ?? '').slice(0, 100),
    difficulty: String(session.caseData.difficulty), outcome: session.outcome, questions,
    final_stress: session.currentStress, clues_found: session.clues.length,
    time_elapsed: session.startTime ? Math.max(0, (session.endedAt - session.startTime) / 1000) : 0,
    source: 'observed_game' as const, embedding_model: EMBEDDING_SPACE.model,
    embedding_version: EMBEDDING_SPACE.version, embedding_dimensions: EMBEDDING_SPACE.dimensions,
  };
}
export type CanonicalPattern = ReturnType<typeof canonicalPattern>;
export function patternSummary(pattern: CanonicalPattern): string {
  return JSON.stringify({ setting: pattern.setting, difficulty: pattern.difficulty,
    outcome: pattern.outcome, questions: pattern.questions });
}

export function summarizePatterns(patterns: CanonicalPattern[]) {
  const compatible = patterns.filter(pattern => pattern.source === 'observed_game'
    && pattern.embedding_version === EMBEDDING_SPACE.version && pattern.embedding_model === EMBEDDING_SPACE.model
    && pattern.embedding_dimensions === EMBEDDING_SPACE.dimensions);
  const frequencies = new Map<string, number>();
  for (const pattern of compatible.filter(item => item.outcome === 'win')) {
    const questions = new Set((pattern.questions ?? []).filter(question => typeof question === 'string')
      .map(question => question.trim().toLowerCase()).filter(question => question.length > 10));
    for (const question of questions) frequencies.set(question, (frequencies.get(question) ?? 0) + 1);
  }
  return { tactics: [...frequencies].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([question]) => question),
    totalGames: compatible.length, status: 'available' as const,
    interpretation: 'Questions observed in similar completed wins; effectiveness is not established.' };
}
