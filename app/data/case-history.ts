const STORAGE_KEY = 'caseHistory';
const MAX_ENTRIES = 50;

export interface CaseHistoryEntry {
  setting: string;
  won: boolean;
  score?: number;
  difficulty: string;
  timestamp: number;
}

export interface CaseStats {
  totalPlayed: number;
  wins: number;
  winRate: number;
  bestScore: number | null;
}

export function saveCaseResult(entry: CaseHistoryEntry): void {
  try {
    const history = getCaseHistory();
    history.push(entry);
    // Keep only the most recent entries
    const trimmed = history.slice(-MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch { /* private browsing or quota exceeded */ }
}

export function getCaseHistory(): CaseHistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function getCaseStats(): CaseStats | null {
  const history = getCaseHistory();
  if (history.length === 0) return null;

  const wins = history.filter((e) => e.won).length;
  const scores = history.filter((e) => e.won && typeof e.score === 'number').map((e) => e.score!);

  return {
    totalPlayed: history.length,
    wins,
    winRate: Math.round((wins / history.length) * 100),
    bestScore: scores.length > 0 ? Math.max(...scores) : null,
  };
}
