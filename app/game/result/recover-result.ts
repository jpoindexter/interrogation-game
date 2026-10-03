import { recoverSession, type SessionSnapshot } from '../state/session-recovery';
import { validateEvaluation } from './validation';
import type { GameResult, ResultKind } from './types';

export function snapshotToGameResult(snapshot: SessionSnapshot, kind: ResultKind): GameResult {
  const evaluation = validateEvaluation(snapshot.result, kind);
  const reply = snapshot.conversationHistory.findLast(message => message.role === 'assistant')?.content;
  return {
    caseData: snapshot.caseData, sessionId: snapshot.caseData.sessionId, winToken: snapshot.winToken,
    conversationHistory: snapshot.conversationHistory, difficulty: evaluation.stats.difficulty,
    timeElapsed: evaluation.stats.timeElapsed, stressLevel: snapshot.stressLevel, maxStress: snapshot.stressLevel,
    gaveUp: snapshot.outcome === 'lose_giveup', timeUp: snapshot.outcome === 'lose_time',
    lawyeredUp: snapshot.outcome === 'lose_lawyer',
    ...(kind === 'win' ? { confession: reply } : { cleverRemark: reply }),
  };
}

export async function recoverResult(id: string, kind: ResultKind, signal: AbortSignal) {
  if (!/^[a-f0-9]{48}$/.test(id)) throw new Error('The result recovery link is invalid.');
  return snapshotToGameResult(await recoverSession(id, signal), kind);
}
