import { AiError } from '../contracts';

export interface ReviewSource { field: string; text: string }
export type ReviewSources = Record<string, ReviewSource>;
const FIELDS = ['suspect_cover_story', 'suspect_true_story', 'the_truth', 'crime', 'suspect_name',
  'suspect_role', 'the_lie', 'the_contradiction', 'briefing'] as const;
const MAX_QUOTE = 600;

/** Exact, deterministic spans; never paraphrase or clip text to fit a quote limit. */
export function reviewSources(candidate: Record<string, unknown>): ReviewSources {
  const sources: ReviewSources = {};
  const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
  const add = (field: string, id: string, value: unknown) => {
    if (typeof value !== 'string' || !value.trim()) return;
    const spans = [value, ...Array.from(segmenter.segment(value), item => item.segment.trim())];
    for (const [index, text] of [...new Set(spans)].entries()) {
      if (text.length <= MAX_QUOTE) sources[`${id}:${index}`] = { field, text };
    }
  };
  for (const field of FIELDS) add(field, field, candidate[field]);
  if (Array.isArray(candidate.detective_leads)) candidate.detective_leads.forEach((lead, index) => add('detective_leads', `lead-${index}`, lead));
  return sources;
}
export function sourceIds(sources: ReviewSources, fields: readonly string[]): string[] {
  return Object.keys(sources).filter(id => fields.includes(sources[id].field));
}
export function sourceSchema(sources: ReviewSources, fields: readonly string[], optional: boolean) {
  const ids = sourceIds(sources, fields);
  if (!ids.length && !optional) throw new AiError('INVALID_REVIEW_EVIDENCE', 'The case has no supported source excerpt for its review.');
  return { type: 'string', enum: optional ? ['', ...ids] : ids };
}
