import { AiError } from '../ai/contracts';
import { aiWorkFailure } from '../limits/ai-http';
import type { SessionResponse } from './request-ledger';

const failures: Record<string, [number, string]> = {
  TIMEOUT: [504, 'The case took too long to prepare. No playable case was saved.'],
  CANCELLED: [502, 'Case preparation was interrupted before it finished.'],
  CODEX_FAILED: [503, 'The local AI could not finish the case. Check Codex sign-in and usage availability.'],
  CODEX_UNAVAILABLE: [503, 'The local AI could not start. Check the Codex installation and sign-in.'],
  CASE_REVIEW_REJECTED: [502, 'The case did not pass its evidence review. It has not been opened for play.'],
  INVALID_CASE_CONTENT: [502, 'The case contained unfinished text. It has not been opened for play.'],
  INVALID_REVIEW_EVIDENCE: [502, 'The evidence review could not be verified. It has not been opened for play.'],
  INVALID_RESPONSE: [502, 'The AI returned an incomplete case response. It has not been opened for play.'],
};

export function generationFailure(cause: unknown): SessionResponse {
  const budget = aiWorkFailure(cause);
  if (budget) return budget;
  const known = cause instanceof AiError ? failures[cause.code] : undefined;
  const [status, message] = known ?? [502, 'Case preparation could not be completed. No playable case was saved.'];
  return { status, body: { error: message, code: known ? (cause as AiError).code : 'ACTION_FAILED' } };
}
