import { GENERATED_REVIEW_SCHEMA, type GeneratedReview } from './contract';
import { EVIDENCE_LINKS } from './evidence';
import { sourceSchema, type ReviewSources } from './sources';
import { ReviewEvidenceError } from './quotes';

const TRUTH = ['suspect_true_story', 'the_truth'];
const RULES = {
  'actors.crimeQuote': ['crime'],
  'actors.canonicalQuote': [...TRUTH, 'suspect_name', 'suspect_role'],
  'evidence.claimQuote': ['the_lie'],
  'evidence.evidenceQuote': ['the_contradiction'],
  'discovery.leadQuote': ['briefing', 'detective_leads'],
  'discovery.questionAvailableQuote': ['the_contradiction', ...TRUTH],
  ...Object.fromEntries(EVIDENCE_LINKS.map(key => [`evidenceReasoning.obligations.${key}.supportQuote`, ['the_contradiction', 'suspect_true_story']])),
};
type Schema = Record<string, unknown> & { properties?: Record<string, Schema>; items?: Schema };
function schemaNode(schema: Schema, path: string) {
  return path.split('.').reduce((node, key) => node.properties![key], schema);
}
export function referencedReviewSchema(sources: ReviewSources): Record<string, unknown> {
  const schema = structuredClone(GENERATED_REVIEW_SCHEMA) as Schema;
  const comparisons = schema.properties!.comparisons;
  const claim = comparisons.properties!.claims.items!;
  claim.properties!.coverQuote = sourceSchema(sources, ['suspect_cover_story'], false);
  claim.properties!.truthQuote = sourceSchema(sources, TRUTH, true);
  for (const [path, fields] of Object.entries(RULES)) {
    const keys = path.split('.'); const key = keys.pop()!;
    schemaNode(comparisons, keys.join('.')).properties![key] = sourceSchema(sources, fields, path !== 'evidence.claimQuote');
  }
  return schema;
}
function visitQuotes(review: GeneratedReview, transform: (id: string, fields: string[], path: string) => string): void {
  review.comparisons.claims.forEach((claim, index) => {
    claim.coverQuote = transform(claim.coverQuote, ['suspect_cover_story'], `claims[${index}].coverQuote`);
    claim.truthQuote = transform(claim.truthQuote, TRUTH, `claims[${index}].truthQuote`);
  });
  for (const [path, fields] of Object.entries(RULES)) {
    const keys = path.split('.'); const key = keys.pop()!;
    const object = keys.reduce((node, part) => node[part] as Record<string, unknown>, review.comparisons as unknown as Record<string, unknown>);
    object[key] = transform(String(object[key]), fields, path);
  }
}
/** Resolve validated IDs back to readable canonical excerpts before the existing acceptance gate. */
export function resolveReviewSources(raw: GeneratedReview, sources: ReviewSources): GeneratedReview {
  const review = structuredClone(raw);
  visitQuotes(review, (id, fields, path) => {
    if (!id) return '';
    const source = sources[id];
    if (!source || !fields.includes(source.field)) {
      throw new ReviewEvidenceError([{ path, quote: id,
        allowedSources: Object.fromEntries(Object.entries(sources).filter(([, item]) => fields.includes(item.field)).map(([key, item]) => [key, item.text])) }]);
    }
    return source.text;
  });
  return review;
}

/** Inspect only citation slots after schema rejection; do not retain unrelated model text. */
export function invalidReviewReferences(raw: Record<string, unknown>, sources: ReviewSources) {
  const failures: import('./quotes').QuoteFailure[] = [];
  const comparisons = raw.comparisons;
  if (!comparisons || typeof comparisons !== 'object' || Array.isArray(comparisons)) return failures;
  const inspect = (path: string, value: unknown, fields: string[]) => {
    if (value === '' || (typeof value === 'string' && sources[value] && fields.includes(sources[value].field))) return;
    failures.push({ path, quote: typeof value === 'string' ? value : `[${typeof value}]`,
      allowedSources: Object.fromEntries(Object.entries(sources).filter(([, item]) => fields.includes(item.field)).map(([id, item]) => [id, item.text])) });
  };
  const claims = (comparisons as Record<string, unknown>).claims;
  if (Array.isArray(claims)) claims.slice(0, 12).forEach((value, index) => {
    const claim = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    inspect(`claims[${index}].coverQuote`, claim.coverQuote, ['suspect_cover_story']);
    inspect(`claims[${index}].truthQuote`, claim.truthQuote, TRUTH);
  });
  for (const [path, fields] of Object.entries(RULES)) {
    const value = path.split('.').reduce<unknown>((node, key) => node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined, comparisons);
    inspect(path, value, fields);
  }
  return failures;
}
