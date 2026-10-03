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
export const DETECTIVE_VOICE = '2EiwWnXFnvU5JabPnv8n';

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function pickVoice(suspectName: string, suspectGender?: string): string {
  const hash = hashName(suspectName);
  const isFemale = suspectGender ? suspectGender.toLowerCase() === 'female' : hash % 2 === 1;
  const pool = isFemale ? VOICES.female : VOICES.male;
  return pool[hash % pool.length];
}
