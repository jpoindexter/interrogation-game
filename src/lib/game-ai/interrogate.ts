import type { AiProvenance } from '../ai/contracts';
// Game dialogue orchestration over the configured provider capability.
import { executionOptions, type AiExecution } from '../ai/execution';
import { requestStructured } from '../ai/provider';
import { SUSPECT_SCHEMA } from '../ai/schemas';
import { buildSuspectPrompt } from '../ai/prompts/suspect';
import { sanitizeInterrogationResponse } from './sanitize-response';
import type { ConversationMessage, SuspectCase } from '../ai/types';

type InterrogationArguments = [
  caseData: SuspectCase, conversationHistory: ConversationMessage[], playerQuestion: string,
  questionCount?: number, currentStress?: number, learnedTactics?: string[], execution?: AiExecution | string,
];

export async function interrogate(...args: InterrogationArguments) {
  const [caseData, conversationHistory, playerQuestion, questionCount = 0, currentStress = 0, learnedTactics = [], execution] = args;
  let provenance: AiProvenance | undefined;
  const raw = await requestStructured({ ...executionOptions(execution), capability: 'suspect', schema: SUSPECT_SCHEMA,
    instructions: buildSuspectPrompt({ caseData, questionCount, currentStress, learnedTactics }),
    input: JSON.stringify({ conversationHistory, playerQuestion }),
    onProvenance: value => { provenance = value; executionOptions(execution).onProvenance?.(value); },
  });
  return { ...sanitizeInterrogationResponse(raw), _aiProvenance: provenance };
}
