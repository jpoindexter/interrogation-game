import type { GameplayCase } from './types';
import { requireCondition } from './errors';

function uniqueIds(items: { id: string }[]): boolean {
  return items.every(item => /^[a-z][a-z0-9-]{0,63}$/.test(item.id))
    && new Set(items.map(item => item.id)).size === items.length;
}

/** Validates authored graph references, not narrative consistency or real-world truth. */
export function validateGameplayCase(caseData: GameplayCase): void {
  requireCondition(uniqueIds(caseData.claims) && uniqueIds(caseData.exhibits)
    && uniqueIds(caseData.contradictions), 'INVALID_CASE', 'Case identifiers must be unique and valid.');
  requireCondition(caseData.claims.some(claim => claim.id === caseData.accusationClaimId),
    'INVALID_CASE', 'The accusation must refer to an authored claim.');
  for (const claim of caseData.claims) {
    requireCondition(claim.assertion.trim() && claim.truth.trim() && claim.assertion !== claim.truth,
      'INVALID_CASE', 'Every claim needs a distinct assertion and truth.');
  }
  for (const exhibit of caseData.exhibits) {
    requireCondition(exhibit.text.trim() && exhibit.title.trim(), 'INVALID_CASE', 'Exhibits need readable content.');
  }
  validateLinks(caseData);
  requireCondition(caseData.contradictions.some(link => link.claimId === caseData.accusationClaimId
    && caseData.exhibits.find(exhibit => exhibit.id === link.exhibitId)?.initiallyDisclosed),
  'INVALID_CASE', 'The initial evidence must contain a path to challenge the accusation claim.');
}

function validateLinks(caseData: GameplayCase): void {
  const pairs = new Set<string>();
  for (const link of caseData.contradictions) {
    const pair = `${link.claimId}:${link.exhibitId}`;
    requireCondition(!pairs.has(pair) && caseData.claims.some(claim => claim.id === link.claimId)
      && caseData.exhibits.some(exhibit => exhibit.id === link.exhibitId) && link.explanation.trim(),
    'INVALID_CASE', 'Contradictions must link distinct existing claims and exhibits.');
    pairs.add(pair);
  }
}
