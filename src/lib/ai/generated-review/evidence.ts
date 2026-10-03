import { objectSchema } from '../schemas';

export const EVIDENCE_LINKS = ['actor', 'time', 'meaning'] as const;
export type EvidenceLink = typeof EVIDENCE_LINKS[number];
export interface EvidenceObligation {
  status: 'direct' | 'linked' | 'not_required' | 'missing';
  supportQuote: string;
  reason: string;
}
export interface EvidenceReasoning {
  claimRequires: string;
  recordEstablishes: string;
  obligations: Record<EvidenceLink, EvidenceObligation>;
  alternative: { possible: boolean; explanation: string };
}
const explanation = { type: 'string', minLength: 1, maxLength: 500 };
const obligation = objectSchema({
  status: { type: 'string', enum: ['direct', 'linked', 'not_required', 'missing'] },
  supportQuote: { type: 'string', maxLength: 600 }, reason: explanation,
});
export const EVIDENCE_REASONING_SCHEMA = objectSchema({
  claimRequires: explanation, recordEstablishes: explanation,
  obligations: objectSchema(Object.fromEntries(EVIDENCE_LINKS.map(key => [key, obligation]))),
  alternative: objectSchema({ possible: { type: 'boolean' }, explanation }),
});

/** Checks reported support, not the semantic truth of a model's interpretation. */
export function evidenceSupportsAcceptance(reasoning: EvidenceReasoning): boolean {
  return !reasoning.alternative.possible && EVIDENCE_LINKS.every(key => {
    const obligation = reasoning.obligations[key];
    return obligation.status === 'not_required'
      || (obligation.status !== 'missing' && obligation.supportQuote.trim().length > 0);
  });
}
