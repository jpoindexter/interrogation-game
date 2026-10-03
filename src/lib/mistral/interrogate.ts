// Compatibility signature while existing callers migrate to provider-neutral capabilities.
import { executionOptions, type AiExecution } from '../ai/execution';
import { requestStructured } from '../ai/provider';
import { SUSPECT_SCHEMA } from '../ai/schemas';
import { buildSuspectPrompt } from '../ai/prompts/suspect';
import { sanitizeInterrogationResponse } from './sanitize-response';
import type { ConversationMessage, SuspectCase } from '../ai/types';

type LegacyInterrogationArguments = [
  caseData: SuspectCase, conversationHistory: ConversationMessage[], playerQuestion: string,
  questionCount?: number, currentStress?: number, learnedTactics?: string[], execution?: AiExecution | string,
];

export async function interrogate(...args: LegacyInterrogationArguments) {
  const [caseData, conversationHistory, playerQuestion, questionCount = 0, currentStress = 0, learnedTactics = [], execution] = args;
  const raw = await requestStructured({ ...executionOptions(execution), capability: 'suspect', schema: SUSPECT_SCHEMA,
    instructions: buildSuspectPrompt({ caseData, questionCount, currentStress, learnedTactics }),
    input: JSON.stringify({ conversationHistory, playerQuestion }),
  });
  return sanitizeInterrogationResponse(raw);
}
