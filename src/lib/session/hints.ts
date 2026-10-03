import type { GameSession } from './types';
import { expireSession } from './transitions';
import { DIFFICULTY_CLUES } from '../game-state';

function hintText(raw: string, number: number, total: number) {
  const words = raw.replace(/^(questions?\s+about\s+|asking\s+about\s+|mentions?\s+of\s+)/i, '')
    .split(/\s+/).filter(word => word.length > 3);
  if (!words.length) return 'Compare the suspect’s timeline with the case briefing.';
  if (number >= total) return `Focus your questioning around: ${words.slice(0, 3).join(' ')}`;
  return `Consider what the suspect has said about “${words[0]}”. Ask for a detail you can check.`;
}

export function requestHint(session: GameSession) {
  expireSession(session);
  if (session.status !== 'active') return { status: 409, body: { error: 'This interrogation is not active.' } };
  const triggers = session.caseData.stress_triggers;
  if (!Array.isArray(triggers) || !triggers.every(value => typeof value === 'string')) {
    return { status: 404, body: { error: 'No hints are available for this case.' } };
  }
  const maxHints = Math.min(DIFFICULTY_CLUES[String(session.caseData.difficulty)] || 3, triggers.length);
  if (session.hintsUsed >= maxHints) return { status: 403, body: { error: 'All hints have been used.' } };
  const hintsUsed = session.hintsUsed + 1;
  const hint = hintText(triggers[hintsUsed - 1], hintsUsed, maxHints);
  session.hintsUsed = hintsUsed;
  session.hintTexts = [...(session.hintTexts ?? []), hint];
  return { status: 200, body: { hint, hintsUsed, maxHints } };
}
