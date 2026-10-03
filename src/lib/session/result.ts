import { projectConversationPath } from './conversation-path';
import { getSessionStats } from './stats';
import type { GameSession } from './types';

export function projectResult(session: GameSession): Record<string, unknown> {
  if (!session.outcome) throw new Error('The interrogation has not ended');
  if (session.evaluation) return { ...session.evaluation, conversationPath: projectConversationPath(session) };
  const stats = getSessionStats(session.id);
  const facts = session.caseData;
  const common = { outcome: session.outcome, stats, detective_rating: stats?.detectiveRating ?? 'Rookie' };
  session.evaluation = session.outcome === 'win' ? {
    ...common, correct: true, explanation: session.acceptedAccusation?.explanation,
    reveal_the_lie: facts.the_lie, reveal_the_truth: facts.the_truth,
    reveal_the_clue: facts.the_contradiction,
  } : {
    ...common, closest_moment: session.conversationHistory.findLast(message => message.role === 'assistant' && message.kind !== 'terminal')?.content
      ?? 'No suspect response was recorded before the interview ended.',
    what_they_missed: facts.the_contradiction,
    the_lie_revealed: facts.the_lie, the_truth_revealed: facts.the_truth,
  };
  return { ...session.evaluation, conversationPath: projectConversationPath(session) };
}
