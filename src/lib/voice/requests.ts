import { authorizeSpeech, authorizeRecording } from './authorize';
import { synthesizeSpeech, transcribeAudio, speechSettings, speechModel, transcriptionModel } from './elevenlabs';
import { reserveVoiceUsage } from './budget';
import { voiceKey } from './errors';
import { runVoiceRequest } from './receipt-service';
import { MAX_AUDIO_BYTES, voiceJson, type VoiceResult } from './receipt-types';
import { voiceHash } from './receipt-store';
import { readVoiceBytes } from './bounded-body';

export async function requestSpeech(body: Record<string, unknown>, signal: AbortSignal): Promise<VoiceResult> {
  const authorized = authorizeSpeech(body);
  const { voiceId } = speechSettings(authorized);
  const fingerprint = JSON.stringify({ sessionId: authorized.session.id, text: authorized.text,
    role: authorized.role, model: speechModel(), voiceId });
  return runVoiceRequest({ requestId: body.requestId, sessionId: authorized.session.id, kind: 'tts', fingerprint, signal,
    work: async deadline => {
      voiceKey();
      reserveVoiceUsage(authorized.session.id, 'speechCharacters', authorized.text.length);
      const response = await synthesizeSpeech(authorized, deadline);
      const bytes = await readVoiceBytes(response.body, MAX_AUDIO_BYTES, deadline);
      if (!bytes.length) throw new Error('Empty synthesized audio');
      return { status: 200, contentType: 'audio/mpeg', body: Buffer.from(bytes).toString('base64') };
    },
  });
}

export async function requestTranscription(form: FormData, signal: AbortSignal): Promise<VoiceResult> {
  const { session, audio } = authorizeRecording(form);
  const fingerprint = JSON.stringify({ sessionId: session.id, hash: voiceHash(new Uint8Array(await audio.arrayBuffer())),
    mime: audio.type, model: transcriptionModel() });
  return runVoiceRequest({ requestId: form.get('requestId'), sessionId: session.id, kind: 'stt', fingerprint, signal,
    work: async deadline => {
      voiceKey();
      reserveVoiceUsage(session.id, 'recordings', 1);
      return voiceJson(200, { text: await transcribeAudio(audio, deadline) });
    },
  });
}
