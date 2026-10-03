import { objectSchema } from '../schemas';
import { COMPARISONS_SCHEMA, comparisonsSupportAcceptance, type ReviewComparisons } from './comparisons';

export const REVIEW_VERSION = 'generated-consistency-v4-source-references';
export const REVIEW_CHECKS = ['singleFalseClaim', 'canonicalConsistency', 'evidenceSufficiency',
  'publicDiscoverability', 'completeReasoning'] as const;
export type ReviewCheck = typeof REVIEW_CHECKS[number];
export interface ReviewAssessment { pass: boolean; reason: string }
export type GeneratedReview = Record<ReviewCheck, ReviewAssessment> & { comparisons: ReviewComparisons };
const assessment = objectSchema({ pass: { type: 'boolean' }, reason: { type: 'string', minLength: 1, maxLength: 600 } });
export const GENERATED_REVIEW_SCHEMA = objectSchema({ comparisons: COMPARISONS_SCHEMA,
  ...Object.fromEntries(REVIEW_CHECKS.map(key => [key, assessment])) });
export function acceptsGeneratedReview(review: GeneratedReview): boolean {
  return REVIEW_CHECKS.every(key => review[key].pass) && comparisonsSupportAcceptance(review.comparisons);
}
