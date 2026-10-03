import { voiceKey, VoiceError } from './errors';
import { readVoiceBytes } from './bounded-body';
import { authorizeSpeech } from './authorize';
import { pickVoice, DETECTIVE_VOICE } from './voices';

async function requestElevenLabs(path: string, options: RequestInit, signal: AbortSignal) {
  const response = await fetch(`https://api.elevenlabs.io/v1/${path}`, {
    ...options, headers: { ...options.headers, 'xi-api-key': voiceKey() },
    signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new VoiceError('The voice provider could not complete this request. Continue with text or retry.', 502);
  }
  return response;
}

export async function transcribeAudio(audio: File, signal: AbortSignal): Promise<string> {
  const form = new FormData();
  form.set('file', audio);
  form.set('model_id', transcriptionModel());
  form.set('language_code', 'eng');
  form.set('tag_audio_events', 'false');
  form.set('diarize', 'false');
  const response = await requestElevenLabs('speech-to-text', { method: 'POST', body: form }, signal);
  const bytes = await readVoiceBytes(response.body, 256 * 1024, signal);
  const data = JSON.parse(Buffer.from(bytes).toString('utf8'));
  if (typeof data.text !== 'string' || !data.text.trim()) {
    throw new VoiceError('No speech was recognized. Try again or type your question.', 422);
  }
  return data.text.trim().slice(0, 2000);
}

export function speechSettings(authorized: ReturnType<typeof authorizeSpeech>) {
  const { session, role } = authorized;
  if (role === 'detective') return { voiceId: DETECTIVE_VOICE, settings: { stability: 0.65, similarity_boost: 0.8, speed: 0.85 } };
  const stress = Math.min(10, Math.max(0, session.currentStress)) / 10;
  return {
    voiceId: pickVoice(String(session.caseData.suspect_name), String(session.caseData.suspect_gender)),
    settings: { stability: 0.7 - stress * 0.35, similarity_boost: 0.75, speed: 0.9 + stress * 0.25 },
  };
}

export function speechModel(): string { return process.env.ELEVENLABS_TTS_MODEL || 'eleven_flash_v2_5'; }
export function transcriptionModel(): string { return process.env.ELEVENLABS_STT_MODEL || 'scribe_v2'; }

export async function synthesizeSpeech(authorized: ReturnType<typeof authorizeSpeech>, signal: AbortSignal) {
  const { voiceId, settings } = speechSettings(authorized);
  return requestElevenLabs(`text-to-speech/${encodeURIComponent(voiceId)}/stream`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text: authorized.text, model_id: speechModel(), voice_settings: settings }),
  }, signal);
}
