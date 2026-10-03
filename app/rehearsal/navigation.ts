export type RehearsalAction = 'next' | 'back' | 'restart';

export function rehearsalIndex(index: number, count: number): number {
  if (!Number.isFinite(index) || count < 1) return 0;
  return Math.max(0, Math.min(Math.trunc(index), count - 1));
}
export function navigateRehearsal(index: number, action: RehearsalAction, count: number): number {
  if (action === 'restart') return 0;
  return rehearsalIndex(index + (action === 'next' ? 1 : -1), count);
}
