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
    stress_triggers: string[];
  };
  conversationHistory: Array<{ role: string; content: string }>;
  maxStress: number;
}

export default function LosePage() {
  const router = useRouter();
  const [result, setResult] = useState<GameResult | null>(null);
  const [summary, setSummary] = useState<{
    detective_rating: string;
    the_lie_revealed: string;
    the_truth_revealed: string;
    closest_moment: string;
    what_they_missed: string;
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
        type: 'lose',
        caseData: parsed.caseData,
        conversationHistory: parsed.conversationHistory,
        maxStress: parsed.maxStress,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setSummary(data);
        } else {
          setSummary({
            detective_rating: 'Rookie',
            the_lie_revealed: parsed.caseData.the_lie,
            the_truth_revealed: parsed.caseData.the_truth,
            closest_moment: 'Unable to analyze.',
            what_they_missed: parsed.caseData.the_contradiction,
          });
        }
      })
      .catch(() => {
        setSummary({
          detective_rating: 'Rookie',
          the_lie_revealed: parsed.caseData.the_lie,
          the_truth_revealed: parsed.caseData.the_truth,
          closest_moment: 'Unable to analyze.',
          what_they_missed: parsed.caseData.the_contradiction,
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

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E8E8E8] font-mono p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-sm uppercase tracking-[0.3em] text-gray-500 mb-2">
            Case #{result.caseData.case_number}
          </p>
          <h1 className="text-5xl font-bold mb-4">SUSPECT WALKS</h1>
          <p className="text-gray-400">Time&apos;s up.</p>
          {summary && (
            <p className="text-2xl mt-4">
              Rating:{' '}
              <span className="text-gray-400 font-bold">
                {summary.detective_rating}
              </span>
            </p>
          )}
        </div>

        {summary ? (
          <div className="space-y-6">
            <div className="bg-[#2A2A2A] p-6 rounded-lg border-l-4 border-[#C41E1E]">
              <h2 className="text-xs uppercase tracking-[0.3em] text-[#C41E1E] mb-3">
                The Lie You Missed
              </h2>
              <p className="text-lg">&ldquo;{summary.the_lie_revealed}&rdquo;</p>
            </div>

            <div className="bg-[#2A2A2A] p-6 rounded-lg border-l-4 border-[#E8E8E8]">
              <h2 className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-3">
                The Truth
              </h2>
              <p className="text-lg">{summary.the_truth_revealed}</p>
            </div>

            <div className="bg-[#2A2A2A] p-6 rounded-lg">
              <h2 className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-3">
                Your Closest Moment
              </h2>
              <p className="text-sm text-gray-300 italic">
                &ldquo;{summary.closest_moment}&rdquo;
              </p>
            </div>

            <div className="bg-[#2A2A2A] p-6 rounded-lg">
              <h2 className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-3">
                What Would Have Cracked Them
              </h2>
              <p className="text-sm text-gray-300">{summary.what_they_missed}</p>
            </div>

            <div className="bg-[#1A1A1A] p-4 rounded-lg">
              <p className="text-sm text-gray-500">
                Max stress reached: {result.maxStress}/10
              </p>
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
            TRY AGAIN
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
