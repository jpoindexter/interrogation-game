// Pool of evidence icons — random ones are picked per case
export const EVIDENCE_ICONS = [
  '/clues/folder.png',
  '/clues/recorder.png',
  '/clues/recorder2.png',
  '/clues/coffee.png',
  '/clues/clue1.png',
  '/clues/clue2.png',
  '/clues/clue3.png',
  '/clues/notepad_pl.png',
  '/clues/magnifying_glass.png',
  '/clues/handcuffs.png',
  '/clues/key.png',
  '/clues/flashlight.png',
  '/clues/walkie_talkie.png',
];

export function pickRandomIcons(count: number): string[] {
  const shuffled = [...EVIDENCE_ICONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Map case setting text to background image
export function getSceneBg(setting: string): string {
  const s = setting.toLowerCase();
  if (s.includes('hospital') || s.includes('medical') || s.includes('clinic') || s.includes('doctor') || s.includes('pharma')) return '/bg/medical.png';
  if (s.includes('law') || s.includes('legal') || s.includes('attorney') || s.includes('firm')) return '/bg/lawfirm.png';
  if (s.includes('server') || s.includes('data center') || s.includes('tech') || s.includes('software') || s.includes('cyber')) return '/bg/server.png';
  if (s.includes('startup') || s.includes('co-working') || s.includes('coworking') || s.includes('incubator')) return '/bg/startup.png';
  if (s.includes('bank') || s.includes('trading') || s.includes('finance') || s.includes('hedge') || s.includes('investment') || s.includes('brokerage') || s.includes('stock')) return '/bg/trade.png';
  if (s.includes('police') || s.includes('precinct') || s.includes('station') || s.includes('interrogation')) return '/bg/police.png';
  return '/bg/office.png';
}

// Difficulty → clues needed
export const DIFFICULTY_CLUES: Record<string, number> = {
  easy: 2,
  medium: 3,
  hard: 4,
  expert: 5,
};

export function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Fetch with AbortController timeout
export async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') throw new Error('Request timed out');
    throw err;
  } finally {
    clearTimeout(id);
  }
}
