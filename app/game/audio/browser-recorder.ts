import { recordingHash, voiceRequestId } from './voice-request-id';
import { requireVoiceSuccess } from './voice-request-error';
import { detectSilence } from './silence-detection';
import type { RecorderDependencies } from './recorder-session';

export function recordingFilename(mime: string): string {
  const type = mime.split(';')[0].trim().toLowerCase();
  const extensions: Record<string, string> = {
    'audio/mp4': 'm4a', 'video/mp4': 'mp4', 'audio/ogg': 'ogg', 'audio/wav': 'wav',
    'audio/mpeg': 'mp3', 'audio/webm': 'webm', 'video/webm': 'webm',
  };
  return `recording.${extensions[type] ?? 'bin'}`;
}

export async function transcribeRecording(blob: Blob, signal: AbortSignal, sessionId?: string, newAttempt = false): Promise<string> {
  if (blob.size > 25 * 1024 * 1024) throw new Error('Audio file too large (max 25 MB).');
  const requestId = await voiceRequestId(['stt', sessionId, await recordingHash(blob), blob.type], newAttempt);
  signal.throwIfAborted();
  const form = new FormData();
  form.append('requestId', requestId);
  form.append('audio', blob, recordingFilename(blob.type));
  if (sessionId) form.append('sessionId', sessionId);
  const response = await fetch('/api/transcribe', {
    method: 'POST', body: form, signal,
  });
  await requireVoiceSuccess(response, 'Transcription failed');
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || !('text' in data) || typeof data.text !== 'string') {
    throw new Error('Invalid transcription response');
  }
  return data.text.trim();
}

export function browserRecorder(sessionId?: string): Omit<RecorderDependencies, 'onListening'> {
  return {
    getStream: () => navigator.mediaDevices.getUserMedia({ audio: true }),
    createRecorder: stream => {
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find(type => MediaRecorder.isTypeSupported(type));
      return new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    },
    detectSilence,
    transcribe: (blob, signal, newAttempt) => transcribeRecording(blob, signal, sessionId, newAttempt),
  };
}
