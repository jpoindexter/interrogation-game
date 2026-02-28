export const DIFFICULTY_CONFIG: Record<string, { label: string; color: string; clues: number; stars: number }> = {
  easy: { label: 'EASY', color: 'var(--diff-easy)', clues: 2, stars: 1 },
  medium: { label: 'MEDIUM', color: 'var(--diff-medium)', clues: 3, stars: 2 },
  hard: { label: 'HARD', color: 'var(--diff-hard)', clues: 4, stars: 3 },
  expert: { label: 'EXPERT', color: 'var(--diff-expert)', clues: 5, stars: 5 },
};

export const CASES = [
  { id: 'startup', title: 'STARTUP', subtitle: 'Fraud, stolen code, faked metrics', bg: '/bg/startup.png', setting: 'startup', difficulty: 'easy' },
  { id: 'office', title: 'CORPORATE OFFICE', subtitle: 'Embezzlement, fraud, cover-ups', bg: '/bg/office.png', setting: 'corporate office', difficulty: 'easy' },
  { id: 'medical', title: 'HOSPITAL', subtitle: 'Record falsification, malpractice cover-up', bg: '/bg/medical.png', setting: 'hospital or medical facility', difficulty: 'medium' },
  { id: 'lawfirm', title: 'LAW FIRM', subtitle: 'Evidence tampering, witness fraud', bg: '/bg/lawfirm.png', setting: 'law firm', difficulty: 'medium' },
  { id: 'server', title: 'TECH COMPANY', subtitle: 'Data theft, sabotage, IP leaks', bg: '/bg/server.png', setting: 'tech company', difficulty: 'hard' },
  { id: 'trade', title: 'TRADING FLOOR', subtitle: 'Insider trading, market manipulation', bg: '/bg/trade.png', setting: 'bank or financial trading firm', difficulty: 'hard' },
  { id: 'police', title: 'POLICE PRECINCT', subtitle: 'Corruption, planted evidence, internal affairs', bg: '/bg/police.png', setting: 'police precinct', difficulty: 'expert' },
];
