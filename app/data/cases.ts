export const DIFFICULTY_CONFIG: Record<string, { label: string; color: string; clues: number; stars: number }> = {
  easy: { label: 'EASY', color: 'var(--diff-easy)', clues: 2, stars: 1 },
  medium: { label: 'MEDIUM', color: 'var(--diff-medium)', clues: 3, stars: 2 },
  hard: { label: 'HARD', color: 'var(--diff-hard)', clues: 4, stars: 3 },
  expert: { label: 'EXPERT', color: 'var(--diff-expert)', clues: 5, stars: 5 },
};

export const CASES = [
  { id: 'startup', title: 'STARTUP', subtitle: 'Fraud, stolen code, faked metrics', description: 'A hot startup just closed Series B — but an anonymous tip claims the demo was faked, the code was stolen, and the growth metrics are fiction. Someone inside knows the truth.', bg: '/bg/startup.png', folder: '/ui/folders/startup.png', setting: 'startup', difficulty: 'easy' },
  { id: 'office', title: 'CORPORATE OFFICE', subtitle: 'Embezzlement, fraud, cover-ups', description: 'Millions have vanished from the quarterly books. The CFO says it\'s an accounting error. Internal audit says otherwise. Someone on the executive floor is lying.', bg: '/bg/office.png', folder: '/ui/folders/office.png', setting: 'corporate office', difficulty: 'easy' },
  { id: 'medical', title: 'HOSPITAL', subtitle: 'Record falsification, malpractice cover-up', description: 'A patient died under suspicious circumstances. Medical records were altered post-mortem. The attending physician claims innocence, but the timestamps tell a different story.', bg: '/bg/medical.png', folder: '/ui/folders/medical.png', setting: 'hospital or medical facility', difficulty: 'medium' },
  { id: 'lawfirm', title: 'LAW FIRM', subtitle: 'Evidence tampering, witness fraud', description: 'Key evidence in a high-profile trial was swapped. A witness changed their testimony overnight. Someone at the firm is pulling strings — and getting paid to do it.', bg: '/bg/lawfirm.png', folder: '/ui/folders/lawfirm.png', setting: 'law firm', difficulty: 'medium' },
  { id: 'server', title: 'TECH COMPANY', subtitle: 'Data theft, sabotage, IP leaks', description: 'Proprietary source code appeared on a competitor\'s servers. The breach came from inside. Access logs were wiped, but one employee\'s alibi doesn\'t add up.', bg: '/bg/server.png', folder: '/ui/folders/server.png', setting: 'tech company', difficulty: 'hard' },
  { id: 'trade', title: 'TRADING FLOOR', subtitle: 'Insider trading, market manipulation', description: 'Someone made $4M on a trade placed 90 seconds before a merger announcement. The SEC is watching. The trader says it was luck. The phone records say otherwise.', bg: '/bg/trade.png', folder: '/ui/folders/trade.png', setting: 'bank or financial trading firm', difficulty: 'hard' },
  { id: 'police', title: 'POLICE PRECINCT', subtitle: 'Corruption, planted evidence, internal affairs', description: 'A decorated officer is suspected of planting evidence on three separate cases. Internal affairs has been stonewalled. The blue wall of silence is thick — but someone will crack.', bg: '/bg/police.png', folder: '/ui/folders/police.png', setting: 'police precinct', difficulty: 'expert' },
];
