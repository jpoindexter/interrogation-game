import { NextRequest, NextResponse } from 'next/server';

// Voice pool — different voices for different suspects
const VOICES = {
  male: [
    'CwhRBWXzGAHq8TQ4Fs17', // Roger — laid-back, resonant
    'IKne3meq5aSn9XLyUdCD', // Charlie — deep, confident
    'JBFqnCBsd6RMkjVDRZzb', // George — warm, british
    'N2lVS1w4EtoT3dr4eOWO', // Callum — husky trickster
    'cjVigY5qzO86Huf0OWal', // Eric — smooth, trustworthy
    'nPczCjzI2devNBz1zQrb', // Brian — deep, comforting
    'onwK4e9ZLuTAKqWW03F9', // Daniel — steady broadcaster
    'pNInz6obpgDQGcFmaJgB', // Adam — dominant, firm
    'pqHfZKP75CvOlQylNhV4', // Bill — wise, mature
  ],
  female: [
    'EXAVITQu4vr4xnSDxMaL', // Sarah — mature, confident
    'FGY2WhTYpPnrIDTdsKH5', // Laura — quirky
    'Xb7hH8MSUJpSbSDYk0k2', // Alice — clear, british
    'XrExE9yKIg1WjnnlVkGX', // Matilda — professional
    'cgSgspJ2msm6clMCkdW9', // Jessica — warm
    'pFZP5JQG7iQjIQuC4Bku', // Lily — velvety, british
  ],
};

// Simple hash to pick a voice deterministically from suspect name
function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pickVoice(suspectName: string, suspectGender?: string): string {
  const hash = hashName(suspectName);
  const isFemale = suspectGender ? suspectGender.toLowerCase() === 'female' : hash % 2 === 1;
  const pool = isFemale ? VOICES.female : VOICES.male;
  return pool[hash % pool.length];
}

export async function POST(req: NextRequest) {
  try {
    const { text, stress, suspectName, suspectGender } = await req.json();

    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs not configured' },
        { status: 500 }
      );
    }

    // Pick voice based on suspect name + gender, fallback to env var
    const voiceId = suspectName
      ? pickVoice(suspectName, suspectGender)
      : process.env.ELEVENLABS_VOICE_ID || VOICES.male[0];

    // Stress affects voice: higher stress = faster, less stable
    const stressNorm = Math.min(Math.max((stress ?? 0) / 10, 0), 1);
    const stability = 0.7 - stressNorm * 0.35;
    const similarityBoost = 0.75;
    const speed = 0.9 + stressNorm * 0.25;

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
            speed,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('ElevenLabs error:', err);
      return NextResponse.json(
        { error: 'TTS failed' },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json(
      { error: 'TTS failed' },
      { status: 500 }
    );
  }
}
