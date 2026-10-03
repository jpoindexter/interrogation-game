import { AiError } from '../contracts';
import type { ReviewComparisons } from './comparisons';
import { EVIDENCE_LINKS } from './evidence';

export interface QuoteFailure {
  path: string;
  quote: string;
  allowedSources: Record<string, string>;
}
function normalize(value: unknown): string {
  return String(value ?? '').normalize('NFKC').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
}
export class ReviewEvidenceError extends AiError {
  constructor(readonly failures: QuoteFailure[]) {
    super('INVALID_REVIEW_EVIDENCE', 'The case review could not verify its quoted facts. Start a new case attempt.');
  }
}
/** Literal provenance only; valid excerpts do not make the model's interpretation correct. */
export function assertReviewQuotes(comparisons: ReviewComparisons, candidate: Record<string, unknown>): void {
  const failures: QuoteFailure[] = [];
  const check = (path: string, quote: string, fields: string[]) => {
    const allowedSources = Object.fromEntries(fields.map(field => [field, String(candidate[field] ?? '')]));
    const text = normalize(quote);
    if (text && !Object.values(allowedSources).some(source => normalize(source).includes(text))) {
      failures.push({ path, quote, allowedSources });
    }
  };
  const truth = ['suspect_true_story', 'the_truth'];
  comparisons.claims.forEach((claim, index) => {
    check(`claims[${index}].coverQuote`, claim.coverQuote, ['suspect_cover_story']);
    check(`claims[${index}].truthQuote`, claim.truthQuote, truth);
  });
  check('actors.crimeQuote', comparisons.actors.crimeQuote, ['crime']);
  check('actors.canonicalQuote', comparisons.actors.canonicalQuote, [...truth, 'suspect_name', 'suspect_role']);
  check('evidence.claimQuote', comparisons.evidence.claimQuote, ['the_lie']);
  check('evidence.evidenceQuote', comparisons.evidence.evidenceQuote, ['the_contradiction']);
  for (const key of EVIDENCE_LINKS) check(`evidenceReasoning.obligations.${key}.supportQuote`,
    comparisons.evidenceReasoning.obligations[key].supportQuote, ['the_contradiction', 'suspect_true_story']);
  const leads = Array.isArray(candidate.detective_leads) ? candidate.detective_leads : [];
  const leadQuote = normalize(comparisons.discovery.leadQuote);
  if (!leads.some(lead => normalize(lead).includes(leadQuote))) {
    check('discovery.leadQuote', comparisons.discovery.leadQuote, ['briefing']);
  }
  check('discovery.questionAvailableQuote', comparisons.discovery.questionAvailableQuote, ['the_contradiction', ...truth]);
  if (failures.length) throw new ReviewEvidenceError(failures);
}
