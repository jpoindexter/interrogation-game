import type { CaseStats } from '../data/case-history';

function readArray(value: string | null): unknown[] {
  try {
    const parsed: unknown = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function summarizeCaseProgress(historyValue: string | null, solvedValue: string | null) {
  const solvedCases = readArray(solvedValue).filter((value): value is string => typeof value === 'string');
  const history = readArray(historyValue).filter((value): value is { won: boolean; score?: number } =>
    typeof value === 'object' && value !== null && 'won' in value && typeof value.won === 'boolean');
  const wins = history.filter(entry => entry.won);
  const scores = wins.flatMap(entry => typeof entry.score === 'number' && Number.isFinite(entry.score) ? [entry.score] : []);
  const stats: CaseStats | null = history.length ? {
    totalPlayed: history.length,
    wins: wins.length,
    winRate: Math.round(wins.length / history.length * 100),
    bestScore: scores.length ? Math.max(...scores) : null,
  } : null;
  return { solvedCases, stats };
}
