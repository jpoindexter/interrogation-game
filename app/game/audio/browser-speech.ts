import { readPreferences } from '../../settings/preferences-store';
import type { SpeechDependencies } from './speech-player';
import { voiceRequestId } from './voice-request-id';
import { requireVoiceSuccess } from './voice-request-error';

export function getVoiceVolume(): number { return readPreferences().voiceVolume; }
export function voiceEnabled(): boolean { return readPreferences().ttsEnabled; }

export const browserSpeech: SpeechDependencies = {
  async fetchAudio(body, signal) {
    if (!body || typeof body !== 'object') throw new Error('Invalid speech request');
    const payload = body as Record<string, unknown>;
    const requestId = await voiceRequestId(['tts', payload.sessionId, payload.text, payload.role || 'suspect']);
    signal.throwIfAborted();
    const response = await fetch('/api/tts', {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, requestId }),
    });
    await requireVoiceSuccess(response, 'TTS failed');
    return response.blob();
  },
  createUrl: blob => URL.createObjectURL(blob),
  revokeUrl: url => URL.revokeObjectURL(url),
  createAudio: url => new Audio(url),
};
