'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import InitialsEntry from './InitialsEntry';
import { canRankResult, resultModePresentation } from '../result/mode-presentation';
import { resultClient } from '../result/result-client';
import type { Evaluation, GameResult } from '../result/types';

export function ScoreSubmission({ result, evaluation }: { result: GameResult; evaluation: Evaluation }) {
  const router = useRouter();
  const [showInitials, setShowInitials] = useState(false);
  if (!canRankResult(evaluation.stats)) {
    return <p className="mt-6 text-center text-sm text-gray-300">{resultModePresentation(evaluation.stats).ranking}</p>;
  }
  if (!result.winToken) return <p className="mt-6 text-center text-sm text-gray-300">A score token is unavailable for this result.</p>;
  return <>
    <div className="mt-6 text-center">
      <button onClick={() => setShowInitials(true)} className="bg-gold text-black px-6 py-3 font-bold rounded-sm">Save to leaderboard</button>
    </div>
    {showInitials && <InitialsEntry score={evaluation.stats.score}
      onSubmit={initials => resultClient.submit(result, initials)} onViewScore={() => setShowInitials(false)}
      onViewLeaderboard={() => router.push('/leaderboard')} />}
  </>;
}
