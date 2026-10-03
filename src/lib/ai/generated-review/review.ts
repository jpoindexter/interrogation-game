import { requestStructured } from '../provider';
import { AiError } from '../contracts';
import { type AiExecution, ensureNotAborted } from '../execution';
import { GENERATED_REVIEW_SCHEMA, acceptsGeneratedReview, type GeneratedReview } from './contract';
import { assertReviewQuotes } from './quotes';
import { GENERATED_REVIEW_INSTRUCTIONS } from './prompt';

/** Separate inference; findings remain private and are never merged into the public case. */
export async function reviewGeneratedCase(candidate: Record<string, unknown>, execution: AiExecution = {}): Promise<GeneratedReview> {
  const raw = await requestStructured({ capability: 'case-review', instructions: GENERATED_REVIEW_INSTRUCTIONS,
    input: JSON.stringify({ candidate }), schema: GENERATED_REVIEW_SCHEMA, signal: execution.signal });
  ensureNotAborted(execution.signal);
  const review = raw as GeneratedReview;
  assertReviewQuotes(review.comparisons, candidate);
  return review;
}
export async function assertGeneratedReview(candidate: Record<string, unknown>, execution: AiExecution): Promise<void> {
  const review = await reviewGeneratedCase(candidate, execution);
  if (!acceptsGeneratedReview(review)) {
    throw new AiError('CASE_REVIEW_REJECTED', 'The generated case did not pass its consistency review. Start a new case attempt.');
  }
}
