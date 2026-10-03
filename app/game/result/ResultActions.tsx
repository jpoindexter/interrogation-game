import { useState } from 'react';
import Link from 'next/link';
import ShareModal from '../components/ShareModal';
import TranscriptViewer from '../components/TranscriptViewer';
import type { GameResult } from './types';
const button = 'px-5 py-3 bg-surface text-gray-200 text-sm font-bold uppercase tracking-wider rounded-sm hover:bg-surface-hover';

export function ResultActions({ result, difficulty, won }: { result: GameResult; difficulty: string; won: boolean }) {
  const [showShare, setShowShare] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const nextCase = nextCaseAction(result, difficulty, won);
  const shareText = `INTERROGATION — Case #${result.caseData.case_number}. ${won ? 'Case solved.' : 'Interview ended.'} Can you find the contradiction?`;
  return <>
    <nav aria-label="After this case" className="flex flex-wrap gap-2 justify-center mt-8">
      <Link className={`${button} text-gold`} href={nextCase.href}>{nextCase.label}</Link>
      <Link className={button} href="/cases">Other cases</Link>
      {won && <Link className={button} href="/leaderboard">Leaderboard</Link>}
      <button className={button} onClick={() => setShowShare(true)}>Share</button>
      <button className={button} onClick={() => setShowTranscript(true)}>Transcript</button>
    </nav>
    {showTranscript && <TranscriptViewer conversationHistory={result.conversationHistory}
      suspectName={result.caseData.suspect_name} onClose={() => setShowTranscript(false)} />}
    <ShareModal show={showShare} text={shareText} url={typeof window === 'undefined' ? '' : window.location.origin}
      onClose={() => setShowShare(false)} />
  </>;
}

function nextCaseAction(result: GameResult, difficulty: string, won: boolean) {
  if (result.caseData.mode === 'redteam') {
    return { href: '/game?mode=redteam&difficulty=easy', label: 'Replay practice case' };
  }
  const progression: Record<string, string> = { easy: 'medium', medium: 'hard', hard: 'expert', expert: 'expert' };
  const next = won ? progression[difficulty] || 'medium' : difficulty;
  return {
    href: `/game?setting=${encodeURIComponent(result.caseData.setting)}&difficulty=${next}`,
    label: won ? `New ${next} case` : 'New case, same setting',
  };
}
