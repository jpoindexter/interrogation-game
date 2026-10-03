import { reviewSources } from '../src/lib/ai/generated-review/sources';
import { referencedReviewSchema } from '../src/lib/ai/generated-review/references';
import { REVIEW_CHECKS, type GeneratedReview } from '../src/lib/ai/generated-review/contract';
import { authoredCaseData } from '../src/lib/gameplay/session';

/** Controlled provider response for transport/gate tests, not a real semantic assessment. */
export function passingReview(candidate: Record<string, unknown> = authoredCaseData()): GeneratedReview {
  const text = (key: string) => String(candidate[key] ?? '');
  const verdicts = Object.fromEntries(REVIEW_CHECKS.map(key => [key, { pass: true, reason: 'Controlled fixture assessment.' }]));
  return { ...verdicts, comparisons: {
    claims: [{ coverQuote: text('suspect_cover_story'), truthQuote: text('the_truth'),
      relation: 'contradicted', designatedLie: true, reason: 'Controlled single-claim fixture.' }],
    actors: { crimeQuote: text('crime'), canonicalQuote: text('suspect_role'), conflict: false, reason: 'Controlled identity fixture.' },
    evidenceReasoning: { claimRequires: 'Controlled claim.', recordEstablishes: 'Controlled observation.',
      obligations: { actor: { status: 'direct', supportQuote: text('the_contradiction'), reason: 'Controlled actor.' },
        time: { status: 'not_required', supportQuote: '', reason: 'Controlled untimed denial.' },
        meaning: { status: 'direct', supportQuote: text('the_contradiction'), reason: 'Controlled action.' } },
      alternative: { possible: false, explanation: 'Controlled direct observation.' } },
    evidence: { claimQuote: text('the_lie'), evidenceQuote: text('the_contradiction'), sufficient: true, reason: 'Controlled evidence fixture.' },
    discovery: { leadQuote: Array.isArray(candidate.detective_leads) ? String(candidate.detective_leads[0]) : '',
      questionAvailableQuote: text('the_contradiction'), accessible: true, reason: 'Controlled discovery fixture.' },
  } } as GeneratedReview;
}

/** Encode controlled literal fixtures into the actual provider's field-restricted reference schema. */
export function referencedReviewFixture(review: GeneratedReview, candidate: Record<string, unknown>): GeneratedReview {
  const sources = reviewSources(candidate);
  type Schema = { enum?: string[]; properties?: Record<string, Schema>; items?: Schema };
  const encode = (value: unknown, schema: Schema): unknown => {
    if (typeof value === 'string' && schema.enum?.some(id => id in sources)) {
      if (value === '') return '';
      return schema.enum.find(id => sources[id]?.text === value) ?? 'invalid-reference';
    }
    if (Array.isArray(value)) return value.map(item => encode(item, schema.items ?? {}));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) =>
      [key, encode(item, schema.properties?.[key] ?? {})]));
    return value;
  };
  return encode(review, referencedReviewSchema(sources)) as GeneratedReview;
}
