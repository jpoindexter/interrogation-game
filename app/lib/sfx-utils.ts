import { readPreferences } from '../settings/preferences-store';
/** Shared SFX utilities for pages outside the game (which uses the useSfx hook). */

export function getSfxVolume(): number {
  try { return readPreferences().sfxVolume; } catch {}
  return 0.5;
}

export function playClick(vol = 0.4): void {
  const m = getSfxVolume(); if (m === 0) return;
  try { const a = new Audio('/efx/click.mp3'); a.volume = vol * m; a.play().catch(() => {}); } catch {}
}

export function playSfx(src: string, vol: number): void {
  const m = getSfxVolume(); if (m === 0) return;
  try { const a = new Audio(src); a.volume = vol * m; a.play().catch(() => {}); } catch {}
}
