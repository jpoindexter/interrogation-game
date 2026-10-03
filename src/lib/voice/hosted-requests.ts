import { createHash } from 'node:crypto';
import { hostedVoiceConfiguration, HOSTED_RECORDING_BYTES } from '../config/hosted-voice';
import { HostedSessionStorage } from '../storage/hosted/session';
import { HostedVoiceStorage } from '../storage/hosted/voice';
import { parseHostedSessionRecord } from '../storage/hosted/validate-session';
import { withSessionWorkspace } from '../session/workspace';
import { authorizeSpeech, authorizeRecording } from './authorize';
import { synthesizeSpeech, transcribeAudio, speechSettings, speechModel, transcriptionModel } from './elevenlabs';
import { HostedVoiceObjects } from './hosted-objects';
import { runHostedVoice } from './hosted-service';
import { MAX_AUDIO_BYTES, voiceJson } from './receipt-types';
import { readVoiceBytes } from './bounded-body';
import { VoiceError } from './errors';
import { observeProvider } from '../config/provider-observations';

const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
function requestId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(value)) {
    throw new VoiceError('A stable voice request ID is required.', 400, 'INVALID_REQUEST_ID');
  }
  return value;
}
async function load(id: unknown) {
  if (typeof id !== 'string' || !/^[a-f0-9]{48}$/.test(id)) throw new VoiceError('Valid game session required.', 401);
  const snapshot = await new HostedSessionStorage().load(id);
  if (!snapshot) throw new VoiceError('Valid game session required.', 401);
  return parseHostedSessionRecord(snapshot);
}
function stores(bucket: string) { return { receipts: new HostedVoiceStorage(), objects: new HostedVoiceObjects(bucket) }; }

export async function requestHostedSpeech(body: Record<string, unknown>, signal: AbortSignal) {
  const configuration = hostedVoiceConfiguration();
  const id = requestId(body?.requestId);
  const record = await load(body?.sessionId);
  const authorized = withSessionWorkspace({ record }, () => authorizeSpeech(body));
  const fingerprint = hash(JSON.stringify({ text: authorized.text, role: authorized.role,
    model: speechModel(), voiceId: speechSettings(authorized).voiceId, bucket: configuration.bucket }));
  return runHostedVoice({ sessionId: record.session.id, requestId: id, kind: 'tts', fingerprint,
    revision: record.revision, signal, reservation: { deployment: configuration.deployment,
      units: authorized.text.length, policy: configuration.policies.tts },
    work: deadline => observeProvider('voice', 'speech', async () => {
      const response = await synthesizeSpeech(authorized, deadline);
      const bytes = await readVoiceBytes(response.body, MAX_AUDIO_BYTES, deadline);
      if (!bytes.length) throw new VoiceError('The provider returned no audio.', 502);
      return bytes;
    }),
  }, stores(configuration.bucket));
}

export async function requestHostedTranscription(form: FormData, signal: AbortSignal) {
  const configuration = hostedVoiceConfiguration();
  const id = requestId(form.get('requestId'));
  const record = await load(form.get('sessionId'));
  const { audio } = withSessionWorkspace({ record }, () => authorizeRecording(form));
  if (audio.size > HOSTED_RECORDING_BYTES) throw new VoiceError('Recording exceeds the hosted 3 MiB limit. Make a shorter recording or type.', 413);
  const fingerprint = hash(JSON.stringify({ hash: hash(new Uint8Array(await audio.arrayBuffer())),
    mime: audio.type, model: transcriptionModel() }));
  return runHostedVoice({ sessionId: record.session.id, requestId: id, kind: 'stt', fingerprint,
    revision: record.revision, signal, reservation: { deployment: configuration.deployment,
      units: audio.size, policy: configuration.policies.stt },
    work: deadline => observeProvider('voice', 'transcription', async () =>
      voiceJson(200, { text: await transcribeAudio(audio, deadline) })),
  }, stores(configuration.bucket));
}
