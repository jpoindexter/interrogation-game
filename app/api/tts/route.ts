import { NextRequest, NextResponse } from 'next/server';
import { validateString, validateNumber } from '../../../src/lib/sanitize';
import { rateLimit, getClientIp } from '../../../src/lib/rate-limit';
import { getSession } from '../../../src/lib/game-session';

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

// Detective voice — Clyde: war veteran, gravelly noir detective
const DETECTIVE_VOICE = '2EiwWnXFnvU5JabPnv8n';

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
    const ip = getClientIp(req);
    if (!rateLimit(ip, 30)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json();

    // Require active game session to prevent use as a free TTS proxy
    const session = body.sessionId ? getSession(body.sessionId) : null;
    if (!session) {
      return NextResponse.json({ error: 'Valid game session required' }, { status: 401 });
    }

    const text = validateString(body.text, 2000);
    if (!text) {
      return NextResponse.json({ error: 'Text is required (max 2000 chars)' }, { status: 400 });
    }

    // Prevent TTS proxy abuse: text must match a recent assistant message or be a detective briefing
    const role = body.role === 'detective' ? 'detective' : 'suspect';
    if (role !== 'detective') {
      const isGameText = session.conversationHistory.some(
        m => m.role === 'assistant' && m.content.includes(text.slice(0, 80))
      );
      if (!isGameText) {
        return NextResponse.json({ error: 'Text must match game conversation' }, { status: 403 });
      }
    }

    const stress = validateNumber(body.stress, 0, 10) ?? 0;
    const suspectName = typeof body.suspectName === 'string' ? body.suspectName : 'Suspect';
    const suspectGender = typeof body.suspectGender === 'string' ? body.suspectGender : undefined;

    const apiKey = req.headers.get('x-elevenlabs-api-key') || process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ElevenLabs not configured' }, { status: 500 });
    }

    let voiceId: string;
    let stability: number;
    let similarityBoost: number;
    let speed: number;

    if (role === 'detective') {
      // Detective: steady, authoritative, no stress wobble
      voiceId = DETECTIVE_VOICE;
      stability = 0.65;
      similarityBoost = 0.8;
      speed = 0.85;
    } else {
      // Suspect: stress affects voice — higher stress = faster, less stable
      voiceId = pickVoice(suspectName, suspectGender);
      const stressNorm = Math.min(stress / 10, 1);
      stability = 0.7 - stressNorm * 0.35;
      similarityBoost = 0.75;
      speed = 0.9 + stressNorm * 0.25;
    }

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
          optimize_streaming_latency: 4,
          voice_settings: { stability, similarity_boost: similarityBoost, speed },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('ElevenLabs error:', err);
      return NextResponse.json({ error: 'TTS failed' }, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-cache' },
    });
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json({ error: 'TTS failed' }, { status: 500 });
  }
}
