import { NextRequest, NextResponse } from 'next/server';
import { Mistral } from '@mistralai/mistralai';
import { rateLimit, getClientIp } from '../../../src/lib/rate-limit';
import { getSession } from '../../../src/lib/game-session';

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_PREFIXES = ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4', 'video/webm'];

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (!rateLimit(ip, 20)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const formData = await request.formData();

    // Require active game session to prevent use as a free STT proxy
    const sessionId = formData.get('sessionId');
    if (!sessionId || typeof sessionId !== 'string' || !getSession(sessionId)) {
      return NextResponse.json({ error: 'Valid game session required' }, { status: 401 });
    }

    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    if (audioFile.size > MAX_AUDIO_SIZE) {
      return NextResponse.json({ error: 'Audio file too large (max 25MB)' }, { status: 413 });
    }

    if (audioFile.type && !ALLOWED_PREFIXES.some(prefix => audioFile.type.startsWith(prefix))) {
      return NextResponse.json({ error: 'Invalid audio format' }, { status: 400 });
    }

    const result = await mistral.audio.transcriptions.complete({
      model: 'voxtral-mini-latest',
      file: audioFile,
      language: 'en',
    });

    if (!result.text || result.text.trim().length === 0) {
      return NextResponse.json({ error: 'Could not transcribe audio — try speaking louder or closer to the mic' }, { status: 400 });
    }

    return NextResponse.json({ text: result.text });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Voxtral transcription error:', msg, error);
    return NextResponse.json({ error: `Transcription failed: ${msg}` }, { status: 500 });
  }
}
