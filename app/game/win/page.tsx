'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface GameResult {
  caseData: {
    case_number: string;
    suspect_name: string;
    suspect_role: string;
    setting: string;
    crime: string;
    the_lie: string;
    the_truth: string;
    the_contradiction: string;
  };
  conversationHistory: Array<{ role: string; content: string }>;
  confession: string;
  timeRemaining: number;
  stressLevel: number;
}

export default function WinPage() {
  const router = useRouter();
  const [result, setResult] = useState<GameResult | null>(null);
  const [evaluation, setEvaluation] = useState<{
    detective_rating: string;
    reveal_the_lie: string;
    reveal_the_truth: string;
    reveal_the_clue: string;
    explanation: string;
  } | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('gameResult');
    if (!stored) {
      router.push('/');
      return;
    }

    const parsed = JSON.parse(stored) as GameResult;
    setResult(parsed);

    fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'win',
        caseData: parsed.caseData,
        conversationHistory: parsed.conversationHistory,
        playerAccusation:
          parsed.conversationHistory
            .filter((m) => m.role === 'user')
            .pop()?.content ?? '',
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setEvaluation(data);
        } else {
          setEvaluation({
            detective_rating: 'Sharp',
            reveal_the_lie: parsed.caseData.the_lie,
            reveal_the_truth: parsed.caseData.the_truth,
            reveal_the_clue: parsed.caseData.the_contradiction,
            explanation: 'You identified the contradiction in the suspect\'s story.',
          });
        }
      })
      .catch(() => {
        setEvaluation({
          detective_rating: 'Sharp',
          reveal_the_lie: parsed.caseData.the_lie,
          reveal_the_truth: parsed.caseData.the_truth,
          reveal_the_clue: parsed.caseData.the_contradiction,
          explanation: 'You identified the contradiction in the suspect\'s story.',
        });
      });
  }, [router]);

  if (!result) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-[#E8E8E8] font-mono flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#C41E1E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E8E8E8] font-mono p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-sm uppercase tracking-[0.3em] text-[#C41E1E] mb-2">
            Case #{result.caseData.case_number}
          </p>
          <h1 className="text-5xl font-bold mb-4">SUSPECT CRACKED</h1>
          <p className="text-gray-400">
            Time remaining: {formatTime(result.timeRemaining)}
          </p>
          {evaluation && (
            <p className="text-2xl mt-4">
              Rating:{' '}
              <span className="text-[#C41E1E] font-bold">
                {evaluation.detective_rating}
              </span>
            </p>
          )}
        </div>

        {/* Confession */}
        {result.confession && (
          <div className="mb-8 bg-[#1A1A1A] border border-[#C41E1E] rounded-lg p-8">
            <h2 className="text-xs uppercase tracking-[0.3em] text-[#C41E1E] mb-1">
              {result.caseData.suspect_name}
            </h2>
            <p className="text-xs text-gray-500 mb-4">{result.caseData.suspect_role}</p>
            <p className="text-lg leading-relaxed italic text-gray-200">
              &ldquo;{result.confession}&rdquo;
            </p>
          </div>
        )}

        {/* Case breakdown */}
        {evaluation ? (
          <div className="space-y-4">
            <div className="bg-[#2A2A2A] p-6 rounded-lg border-l-4 border-[#C41E1E]">
              <h2 className="text-xs uppercase tracking-[0.3em] text-[#C41E1E] mb-3">
                The Lie
              </h2>
              <p className="text-base">&ldquo;{evaluation.reveal_the_lie}&rdquo;</p>
            </div>

            <div className="bg-[#2A2A2A] p-6 rounded-lg border-l-4 border-[#E8E8E8]">
              <h2 className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-3">
                The Truth
              </h2>
              <p className="text-base">{evaluation.reveal_the_truth}</p>
            </div>

            <div className="bg-[#2A2A2A] p-6 rounded-lg">
              <h2 className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-3">
                How You Caught It
              </h2>
              <p className="text-sm text-gray-300">{evaluation.reveal_the_clue}</p>
            </div>

            <div className="bg-[#2A2A2A] p-6 rounded-lg">
              <h2 className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-3">
                Evaluation
              </h2>
              <p className="text-sm text-gray-300">{evaluation.explanation}</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 border-2 border-[#C41E1E] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-center mt-12">
          <button
            onClick={() => {
              sessionStorage.removeItem('gameResult');
              router.push('/cases');
            }}
            className="px-8 py-4 bg-[#C41E1E] text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
          >
            NEW CASE
          </button>
          <button
            onClick={() => {
              sessionStorage.removeItem('gameResult');
              router.push('/');
            }}
            className="px-8 py-4 bg-[#2A2A2A] text-white font-bold rounded-lg hover:bg-[#3A3A3A] transition-colors"
          >
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  );
}
