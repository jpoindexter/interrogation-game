export const EVIDENCE_ICONS = [
  '/clues/folder.png', '/clues/recorder.png', '/clues/recorder2.png', '/clues/coffee.png',
  '/clues/clue1.png', '/clues/clue2.png', '/clues/clue3.png', '/clues/notepad_pl.png',
  '/clues/magnifying_glass.png', '/clues/handcuffs.png', '/clues/key.png', '/clues/flashlight.png',
  '/clues/walkie_talkie.png',
];

import { DIFFICULTY_CLUES } from '@/lib/game-state';
export { DIFFICULTY_CLUES };

export function pickRandomIcons(count: number): string[] {
  return [...EVIDENCE_ICONS].sort(() => Math.random() - 0.5).slice(0, count);
}

const SCENE_KEYWORDS: [string, string[]][] = [
  ['medical', ['hospital', 'medical', 'clinic', 'doctor', 'pharma']],
  ['lawfirm', ['law', 'legal', 'attorney', 'firm']],
  ['server', ['server', 'data center', 'tech', 'software', 'cyber']],
  ['startup', ['startup', 'co-working', 'coworking', 'incubator']],
  ['trade', ['bank', 'trading', 'finance', 'hedge', 'investment', 'brokerage', 'stock']],
  ['police', ['police', 'precinct', 'station', 'interrogation']],
];

export function getSceneBg(setting: string): string {
  const normalized = setting.toLowerCase();
  const match = SCENE_KEYWORDS.find(([, keywords]) => keywords.some(keyword => normalized.includes(keyword)));
  return `/bg/${match?.[0] ?? 'office'}.png`;
}

export function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') throw new Error('Request timed out');
    throw err;
  } finally { clearTimeout(id); }
}
