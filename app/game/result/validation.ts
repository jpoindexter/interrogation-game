import { isPlayMode, playModeRules } from '../../../src/lib/session/play-mode';
import { validConversationPath } from './conversation-path';
import type { Evaluation, GameResult, LeaderboardReceipt, ResultKind } from './types';

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function validOptionalFields(value: Record<string, unknown>): boolean {
  const text = ['sessionId', 'winToken', 'confession', 'difficulty', 'timeUpRemark', 'cleverRemark'];
  if (text.some(key => value[key] !== undefined && typeof value[key] !== 'string')) return false;
  const numbers = ['timeElapsed', 'stressLevel', 'maxStress'];
  if (numbers.some(key => value[key] !== undefined && (typeof value[key] !== 'number' || !Number.isFinite(value[key])))) return false;
  return !['gaveUp', 'timeUp', 'lawyeredUp'].some(key => value[key] !== undefined && typeof value[key] !== 'boolean');
}
export function readGameResult(raw: string | null): GameResult | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!object(value) || !object(value.caseData)) return null;
    const fields = ['case_number', 'suspect_name', 'suspect_role', 'setting', 'crime'];
    if (!fields.every(field => typeof value.caseData === 'object' && value.caseData !== null
      && typeof (value.caseData as Record<string, unknown>)[field] === 'string')) return null;
    if (!Array.isArray(value.conversationHistory)) return null;
    if (!value.conversationHistory.every(message => object(message)
      && typeof message.role === 'string' && typeof message.content === 'string')) return null;
    if (!validOptionalFields(value)) return null;
    return value as unknown as GameResult;
  } catch { return null; }
}

function validatePath(value: unknown) {
  if (value !== undefined && !validConversationPath(value)) throw new Error('The recorded conversation path is incomplete. Please retry.');
}

function validateMode(stats: Record<string, unknown>): void {
  if (stats.playMode === undefined && stats.ranked === undefined) return;
  if (!isPlayMode(stats.playMode) || stats.ranked !== playModeRules(stats.playMode).ranked) {
    throw new Error('The server returned an incomplete play mode. Please retry.');
  }
}

export function validateEvaluation(value: unknown, kind: ResultKind): Evaluation {
  if (!object(value) || !object(value.stats)) throw new Error('The server returned an incomplete result. Please retry.');
  const outcomes = kind === 'win' ? ['win'] : ['lose_accusations', 'lose_time', 'lose_giveup', 'lose_lawyer'];
  const fields = kind === 'win' ? ['reveal_the_lie', 'reveal_the_truth', 'reveal_the_clue']
    : ['the_lie_revealed', 'the_truth_revealed', 'closest_moment', 'what_they_missed'];
  const validStats = ['timeElapsed', 'hintsUsed', 'accusationsUsed', 'questionsAsked', 'score']
    .every(field => typeof (value.stats as Record<string, unknown>)[field] === 'number'
      && Number.isFinite((value.stats as Record<string, unknown>)[field])
      && Number((value.stats as Record<string, unknown>)[field]) >= 0);
  if (!outcomes.includes(String(value.outcome)) || !fields.every(field => typeof value[field] === 'string')
    || !validStats || !['easy', 'medium', 'hard', 'expert'].includes(String(value.stats.difficulty))
    || typeof value.detective_rating !== 'string') throw new Error('The server returned an incomplete result. Please retry.');
  validatePath(value.conversationPath);
  validateMode(value.stats);
  return value as unknown as Evaluation;
}

export function validateReceipt(value: unknown): LeaderboardReceipt {
  if (!object(value) || value.success !== true || !['string', 'number'].includes(typeof value.id)
    || typeof value.score !== 'number' || !Number.isFinite(value.score)) {
    throw new Error('The server did not confirm this score was saved. Retry to check its status.');
  }
  return value as unknown as LeaderboardReceipt;
}
