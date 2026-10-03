import type { ActorCase } from '../ai/prompts/suspect';
import { gameplayProjection } from '../gameplay/session';
import type { GameSession } from './types';

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/** Construct the actor's entire factual view from public fields and accepted disclosures. */
export function actorCase(session: GameSession): ActorCase {
  const facts = session.caseData;
  return {
    suspect_name: String(facts.suspect_name ?? ''), suspect_role: String(facts.suspect_role ?? ''),
    setting: String(facts.setting ?? ''), difficulty: String(facts.difficulty ?? 'medium'),
    suspect_cover_story: String(facts.suspect_cover_story ?? ''),
    briefing: String(facts.briefing ?? ''), crime: String(facts.crime ?? ''),
    detective_leads: strings(facts.detective_leads),
    disclosedEvidence: [...session.clues.map(clue => clue.text),
      ...(gameplayProjection(session)?.exhibits.map(exhibit => `${exhibit.title}: ${exhibit.text}`) ?? [])],
  };
}
