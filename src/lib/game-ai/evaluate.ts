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
