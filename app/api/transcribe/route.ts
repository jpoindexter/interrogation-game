import { NextResponse } from 'next/server';
import { Mistral } from '@mistralai/mistralai';

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const result = await mistral.audio.transcriptions.complete({
      model: 'voxtral-mini-latest',
      file: audioFile,
      language: 'en',
    });

    return NextResponse.json({ text: result.text ?? '' });
  } catch (error) {
    console.error('Voxtral transcription error:', error);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}
