import type { Evaluation, GameResult } from './types';
interface HistoryStorage { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void }
const settingMatchers: Array<[string, RegExp]> = [
  ['medical', /hospital|medical|clinic/], ['lawfirm', /law|legal|attorney/],
  ['startup', /startup|co-working|incubator/], ['server', /server|data center|tech|software|cyber/],
  ['trade', /bank|trading|finance|hedge|investment|brokerage|stock/],
  ['police', /police|precinct|station/], ['office', /office|corporate/],
];
function storedArray(storage: HistoryStorage, key: string): unknown[] {
  try { const value: unknown = JSON.parse(storage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; }
  catch { return []; }
}
export function recordResult(result: GameResult, evaluation: Evaluation, storage: HistoryStorage): void {
  if (!result.sessionId) return;
  const resultId = result.sessionId;
  const history = storedArray(storage, 'caseHistory');
  const recorded = history.some(entry => entry && typeof entry === 'object' && 'resultId' in entry && entry.resultId === resultId);
  const won = evaluation.outcome === 'win';
  const entry = { resultId, setting: result.caseData.setting, won, difficulty: evaluation.stats.difficulty,
    score: won ? evaluation.stats.score : undefined, playMode: evaluation.stats.playMode, ranked: evaluation.stats.ranked, timestamp: Date.now() };
  if (!recorded) storage.setItem('caseHistory', JSON.stringify([...history, entry].slice(-50)));
  if (!won) return;
  const setting = result.caseData.setting.toLowerCase();
  const solvedId = settingMatchers.find(([, pattern]) => pattern.test(setting))?.[0] || 'random';
  const solved = storedArray(storage, 'solvedCases');
  if (!solved.includes(solvedId)) storage.setItem('solvedCases', JSON.stringify([...solved, solvedId]));
}
