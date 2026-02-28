import { NextResponse } from 'next/server';
import { Mistral } from '@mistralai/mistralai';

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4', 'video/webm'];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    if (audioFile.size > MAX_AUDIO_SIZE) {
      return NextResponse.json({ error: 'Audio file too large (max 25MB)' }, { status: 413 });
    }

    if (audioFile.type && !ALLOWED_TYPES.includes(audioFile.type)) {
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
  } catch (error) {
    console.error('Voxtral transcription error:', error);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}
