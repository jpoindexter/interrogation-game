import { consumeVoice } from '../limits/consume';
import { validateBudgetKey, validateVoiceUnits } from '../limits/validation';
import { VoiceError } from './errors';

/** Durable per-session work limits; reservations remain spent if a provider fails. */
export function reserveVoiceUsage(sessionId: string, kind: 'speechCharacters' | 'recordings', units: number) {
  try { validateBudgetKey(sessionId); validateVoiceUnits(kind, units); }
  catch { throw new VoiceError('Invalid voice budget request.', 400); }
  let allowed: boolean;
  try { allowed = consumeVoice(sessionId, kind, units); }
  catch { throw new VoiceError('Voice budget storage is unavailable. Continue with text or retry later.', 503); }
  if (!allowed) throw new VoiceError('This session has reached its voice limit. Continue with text.', 429);
}
