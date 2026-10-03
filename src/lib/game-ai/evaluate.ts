import { executionOptions, type AiExecution } from '../ai/execution';
import { requestStructured } from '../ai/provider';
import { publicJudgment } from '../ai/judgment';
import { JUDGE_SCHEMA } from '../ai/schemas';
import { JUDGE_INSTRUCTIONS, judgeInput, type JudgeCase } from '../ai/prompts/judge';
import { sanitizeAccusationResponse } from './sanitize-response';
import type { ConversationMessage } from '../ai/types';

export async function evaluateAccusation(
  caseData: JudgeCase, history: ConversationMessage[], accusation: string, execution?: AiExecution | string,
) {
  const raw = await requestStructured({ ...executionOptions(execution), capability: 'judge', schema: JUDGE_SCHEMA,
    instructions: JUDGE_INSTRUCTIONS, input: judgeInput(caseData, history, accusation) });
  const previousAccusations = history.filter(message => message.role === 'user' && message.kind === 'accusation').length;
  return publicJudgment(sanitizeAccusationResponse(raw), previousAccusations);
}

/** Deprecated compatibility projection. The route uses the recorded session verdict. */
export async function evaluateWin(
  caseData: { the_lie: string; the_truth: string; the_contradiction: string },
  _history: ConversationMessage[], _accusation: string,
) {
  void _history;
  void _accusation;
  return { reveal_the_lie: caseData.the_lie, reveal_the_truth: caseData.the_truth,
    reveal_the_clue: caseData.the_contradiction, explanation: 'See the recorded accusation verdict.' };
}

/** Facts remain available without a second model judgment or invented closest moment. */
export async function generateLossSummary(
  caseData: { the_lie: string; the_truth: string; the_contradiction: string; stress_triggers: string[] },
  history: ConversationMessage[], _maxStress: number,
) {
  void _maxStress;
  return { closest_moment: history.findLast(message => message.role === 'assistant')?.content ?? 'No response recorded.',
    what_they_missed: caseData.the_contradiction, the_lie_revealed: caseData.the_lie,
    the_truth_revealed: caseData.the_truth, detective_rating: 'Unrated' };
}
