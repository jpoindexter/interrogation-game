import { getSession } from '../game-session';
import { expireSession } from '../session/transitions';
import { validateString } from '../sanitize';
import { VoiceError } from './errors';

export function voiceSession(id: unknown) {
  const session = typeof id === 'string' ? getSession(id) : null;
  if (!session) throw new VoiceError('Valid game session required', 401);
  expireSession(session);
  return session;
}

function normalize(text: string): string { return text.replace(/\s+/g, ' ').trim(); }

export function authorizeSpeech(body: Record<string, unknown>) {
  if (!body || typeof body !== 'object') throw new VoiceError('Invalid speech request.', 400);
  const session = voiceSession(body.sessionId);
  const text = validateString(body.text, 6000);
  if (!text) throw new VoiceError('Speech text is required (max 6000 characters).', 400);
  const role = body.role === 'detective' ? 'detective' : 'suspect';
  const briefing = ['briefing', 'crime', 'suspect_cover_story']
    .map(key => session.caseData[key]).filter(value => typeof value === 'string').join(' ');
  const allowed = role === 'detective'
    ? normalize(briefing) === normalize(text)
    : session.conversationHistory.some(message => message.role === 'assistant' && normalize(message.content) === normalize(text));
  if (!allowed) throw new VoiceError('Speech must match the complete case briefing or an accepted suspect statement.', 403);
  return { session, text, role };
}

export function authorizeRecording(form: FormData) {
  const session = voiceSession(form.get('sessionId'));
  if (session.status !== 'active') throw new VoiceError('This interrogation is not active.', 409);
  const audio = form.get('audio');
  if (!(audio instanceof File) || audio.size === 0) throw new VoiceError('A recording is required.', 400);
  if (audio.size > 25 * 1024 * 1024) throw new VoiceError('Audio file too large (max 25 MB).', 413);
  const type = audio.type.split(';')[0].toLowerCase();
  if (!['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4', 'video/webm'].includes(type)) {
    throw new VoiceError('Unsupported recording format.', 400);
  }
  return { session, audio };
}
