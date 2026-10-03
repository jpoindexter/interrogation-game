import { objectSchema } from '../schemas';
import { EVIDENCE_REASONING_SCHEMA, evidenceSupportsAcceptance, type EvidenceReasoning } from './evidence';

export interface ClaimComparison {
  coverQuote: string; truthQuote: string; relation: 'consistent' | 'contradicted' | 'not_established';
  designatedLie: boolean; reason: string;
}
export interface ReviewComparisons {
  claims: ClaimComparison[];
  actors: { crimeQuote: string; canonicalQuote: string; conflict: boolean; reason: string };
  evidenceReasoning: EvidenceReasoning;
  evidence: { claimQuote: string; evidenceQuote: string; sufficient: boolean; reason: string };
  discovery: { leadQuote: string; questionAvailableQuote: string; accessible: boolean; reason: string };
}
const quote = { type: 'string', maxLength: 600 };
const reason = { type: 'string', minLength: 1, maxLength: 600 };
export const COMPARISONS_SCHEMA = objectSchema({
  claims: { type: 'array', minItems: 1, maxItems: 12, items: objectSchema({
    coverQuote: { ...quote, minLength: 1 }, truthQuote: quote,
    relation: { type: 'string', enum: ['consistent', 'contradicted', 'not_established'] },
    designatedLie: { type: 'boolean' }, reason,
  }) },
  actors: objectSchema({ crimeQuote: quote, canonicalQuote: quote, conflict: { type: 'boolean' }, reason }),
  evidenceReasoning: EVIDENCE_REASONING_SCHEMA,
  evidence: objectSchema({ claimQuote: { ...quote, minLength: 1 }, evidenceQuote: quote, sufficient: { type: 'boolean' }, reason }),
  discovery: objectSchema({ leadQuote: quote, questionAvailableQuote: quote, accessible: { type: 'boolean' }, reason }),
});

/** Reject a report whose supporting comparisons contradict its favorable verdicts. */
export function comparisonsSupportAcceptance(comparisons: ReviewComparisons): boolean {
  return comparisons.claims.some(claim => claim.designatedLie && claim.relation === 'contradicted' && claim.truthQuote.trim().length > 0)
    && !comparisons.claims.some(claim => !claim.designatedLie && claim.relation === 'contradicted')
    && evidenceSupportsAcceptance(comparisons.evidenceReasoning)
    && !comparisons.actors.conflict && comparisons.evidence.sufficient && comparisons.discovery.accessible
    && comparisons.evidence.evidenceQuote.trim().length > 0
    && comparisons.discovery.leadQuote.trim().length > 0 && comparisons.discovery.questionAvailableQuote.trim().length > 0;
}
