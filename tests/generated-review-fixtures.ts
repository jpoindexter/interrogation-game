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
    evidence: { claimQuote: text('the_lie'), evidenceQuote: text('the_contradiction'), sufficient: true, reason: 'Controlled evidence fixture.' },
    discovery: { leadQuote: Array.isArray(candidate.detective_leads) ? String(candidate.detective_leads[0]) : '',
      questionAvailableQuote: text('the_contradiction'), accessible: true, reason: 'Controlled discovery fixture.' },
  } } as GeneratedReview;
}
