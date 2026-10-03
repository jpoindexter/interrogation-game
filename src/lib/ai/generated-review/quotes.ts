import { AiError } from '../contracts';
import type { ReviewComparisons } from './comparisons';

function normalize(value: unknown): string {
  return String(value ?? '').normalize('NFKC').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
}
function contained(quote: string, fields: unknown[]): boolean {
  const text = normalize(quote);
  return !text || fields.some(field => normalize(field).includes(text));
}
/** Literal provenance only; valid excerpts do not make the model's interpretation correct. */
export function assertReviewQuotes(comparisons: ReviewComparisons, candidate: Record<string, unknown>): void {
  const truth = [candidate.suspect_true_story, candidate.the_truth];
  const claimsValid = comparisons.claims.every(claim => contained(claim.coverQuote, [candidate.suspect_cover_story])
    && contained(claim.truthQuote, truth));
  const actorValid = contained(comparisons.actors.crimeQuote, [candidate.crime])
    && contained(comparisons.actors.canonicalQuote, [...truth, candidate.suspect_name, candidate.suspect_role]);
  const evidenceValid = contained(comparisons.evidence.claimQuote, [candidate.the_lie])
    && contained(comparisons.evidence.evidenceQuote, [candidate.the_contradiction]);
  const leads = Array.isArray(candidate.detective_leads) ? candidate.detective_leads : [];
  const discoveryValid = contained(comparisons.discovery.leadQuote, [candidate.briefing, ...leads])
    && contained(comparisons.discovery.questionAvailableQuote, [candidate.the_contradiction, ...truth]);
  if (!claimsValid || !actorValid || !evidenceValid || !discoveryValid) {
    throw new AiError('INVALID_REVIEW_EVIDENCE', 'The case review could not verify its quoted facts. Start a new case attempt.');
  }
}
