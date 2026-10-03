import { requestStructured } from '../provider';
import { AiError } from '../contracts';
import { type AiExecution, ensureNotAborted } from '../execution';
import { acceptsGeneratedReview, type GeneratedReview } from './contract';
import { assertReviewQuotes, ReviewEvidenceError } from './quotes';
import { recordReviewFailure, recordFailures } from './diagnostics';
import { GENERATED_REVIEW_INSTRUCTIONS } from './prompt';
import { reviewSources } from './sources';
import { referencedReviewSchema, resolveReviewSources, invalidReviewReferences } from './references';

/** Separate inference; findings remain private and are never merged into the public case. */
export async function reviewGeneratedCase(candidate: Record<string, unknown>, execution: AiExecution = {}): Promise<GeneratedReview> {
  const sources = reviewSources(candidate);
  const raw = await requestStructured({ capability: 'case-review', instructions: GENERATED_REVIEW_INSTRUCTIONS,
    input: JSON.stringify({ candidate, sourceCatalog: sources }), schema: referencedReviewSchema(sources),
    onInvalidResponse: response => recordFailures('INVALID_RESPONSE', invalidReviewReferences(response, sources)), signal: execution.signal, onProvenance: execution.onProvenance });
  ensureNotAborted(execution.signal);
  let review: GeneratedReview;
  try {
    review = resolveReviewSources(raw as GeneratedReview, sources);
    assertReviewQuotes(review.comparisons, candidate);
  }
  catch (error) {
    if (error instanceof ReviewEvidenceError) recordReviewFailure(error);
    throw error;
  }
  return review;
}
export async function assertGeneratedReview(candidate: Record<string, unknown>, execution: AiExecution): Promise<void> {
  const review = await reviewGeneratedCase(candidate, execution);
  if (!acceptsGeneratedReview(review)) {
    throw new AiError('CASE_REVIEW_REJECTED', 'The generated case did not pass its consistency review. Start a new case attempt.');
  }
}
