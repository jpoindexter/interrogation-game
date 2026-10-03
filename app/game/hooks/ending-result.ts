import type { ConversationMessage } from '@/lib/mistral';
import type { Evaluation } from '../result/types';
import { validateEvaluation } from '../result/validation';
import type { EndGameDeps } from './endgame-types';

export interface CanonicalEnding {
  outcome: Evaluation['outcome'];
  remark: string;
  conversationHistory: ConversationMessage[];
  evaluation: Evaluation;
  winToken?: string;
}

export function parseEnding(data: Record<string, unknown>, sessionId: string): CanonicalEnding {
  const caseData = data.caseData as Record<string, unknown> | undefined;
  if (caseData?.sessionId !== sessionId || typeof data.spoken_response !== 'string'
    || !Array.isArray(data.conversationHistory)) throw new Error('The ending response is incomplete.');
  const history = data.conversationHistory as ConversationMessage[];
  if (history.some(message => !message || !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string')) {
    throw new Error('The ending transcript is incomplete.');
  }
  const evaluation = validateEvaluation(data.result, data.outcome === 'win' ? 'win' : 'lose');
  if (evaluation.outcome !== data.outcome) throw new Error('The ending outcome does not match its result.');
  return { outcome: evaluation.outcome, remark: data.spoken_response, conversationHistory: history, evaluation,
    winToken: typeof data.winToken === 'string' ? data.winToken : undefined };
}

/** Canonical outcome controls the destination, even when a late client timeout requested this ending. */
export function persistEnding(deps: EndGameDeps, ending: CanonicalEnding): string {
  const kind = ending.outcome === 'win' ? 'win' : 'lose';
  const result = { type: kind, caseData: deps.caseData, sessionId: deps.caseData?.sessionId,
    conversationHistory: ending.conversationHistory, winToken: ending.winToken,
    timeElapsed: ending.evaluation.stats.timeElapsed, difficulty: ending.evaluation.stats.difficulty,
    maxStress: deps.maxStress, gaveUp: ending.outcome === 'lose_giveup', timeUp: ending.outcome === 'lose_time',
    lawyeredUp: ending.outcome === 'lose_lawyer',
    ...(kind === 'win' ? { confession: ending.remark } : { cleverRemark: ending.remark, timeUpRemark: ending.remark }) };
  try {
    sessionStorage.setItem('gameResult', JSON.stringify(result));
    sessionStorage.setItem(`evaluation:v1:${deps.caseData?.sessionId}:${kind}`, JSON.stringify(ending.evaluation));
  } catch { /* The canonical result URL recovers the durable server session without browser storage. */ }
  return `/game/${kind}?session=${encodeURIComponent(deps.caseData!.sessionId)}`;
}
