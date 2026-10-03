import type { GameSession } from './types';

const PRIVATE_FACTS = ['the_truth', 'the_contradiction', 'suspect_true_story'] as const;
const PUBLIC_FACTS = ['crime', 'briefing', 'objective', 'suspect_cover_story'] as const;
const INTERNAL_FIELD = /\b(?:the_truth|the_lie|the_contradiction|suspect_true_story|stress_triggers|deflection_tactics)["']?\s*[=:]/i;

function normalize(text: string): string {
  return text.normalize('NFKC').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function publicFacts(session: GameSession): string[] {
  return [...PUBLIC_FACTS.map(key => String(session.caseData[key] ?? '')),
    ...(Array.isArray(session.caseData.detective_leads) ? session.caseData.detective_leads.map(String) : []),
    ...session.clues.map(clue => clue.text)].map(normalize).filter(Boolean);
}

/** A literal disclosure guard, not a claim to detect arbitrary semantic prompt attacks.
 * Public claims remain discussable. Hidden metadata and verbatim private facts are withheld
 * until the authoritative outcome reveals them; the actor never awards factual progress.
 */
export function inspectDisclosure(session: GameSession, text: string): 'allowed' | 'private_fact' | 'internal_metadata' {
  if (session.outcome) return 'allowed';
  if (INTERNAL_FIELD.test(text)) return 'internal_metadata';
  const response = normalize(text);
  const disclosed = publicFacts(session);
  for (const key of PRIVATE_FACTS) {
    const privateFact = normalize(String(session.caseData[key] ?? ''));
    if (!privateFact || disclosed.some(fact => fact.includes(privateFact))) continue;
    if (response.includes(privateFact)) return 'private_fact';
  }
  return 'allowed';
}
