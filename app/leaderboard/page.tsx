'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface LeaderboardEntry {
  player_name: string;
  case_setting: string;
  suspect_name: string;
  time_remaining: number;
  detective_rating: string;
  score: number;
  clues_found: number;
  hints_used: number;
  accusations_used: number;
  created_at: string;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then((res) => res.json())
      .then((data) => {
        setEntries(data.leaderboard ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const ratingColor = (rating: string) => {
    if (rating === 'Legendary') return 'text-[#C8A050]';
    if (rating === 'Veteran') return 'text-[#C41E1E]';
    if (rating === 'Sharp') return 'text-[#E8E8E8]';
    return 'text-gray-500';
  };

  const rankBadge = (i: number) => {
    if (i === 0) return { label: '1ST', color: 'text-[#C8A050]' };
    if (i === 1) return { label: '2ND', color: 'text-gray-300' };
    if (i === 2) return { label: '3RD', color: 'text-[#B87333]' };
    return { label: `${i + 1}`, color: 'text-gray-600' };
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E8E8E8] font-mono">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-[#C41E1E] mb-2">
            Hall of Records
          </p>
          <h1 className="text-4xl font-bold tracking-wide">LEADERBOARD</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-2 border-[#C41E1E] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg mb-2">No cases solved yet.</p>
            <p className="text-gray-600 text-sm">Crack your first suspect to get on the board.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header row */}
            <div className="grid grid-cols-[40px_1fr_100px_80px_80px] gap-3 px-4 py-2 text-xs uppercase tracking-wider text-gray-600">
              <span>#</span>
              <span>Case</span>
              <span className="text-right">Score</span>
              <span className="text-right">Time</span>
              <span className="text-right">Rating</span>
            </div>

            {entries.map((entry, i) => {
              const rank = rankBadge(i);
              return (
                <div
                  key={i}
                  className={`grid grid-cols-[40px_1fr_100px_80px_80px] gap-3 items-center px-4 py-3 rounded-sm border transition-colors ${
                    i === 0
                      ? 'border-[#C8A050]/30 bg-[#C8A050]/5'
                      : i < 3
                        ? 'border-[#2A2A2A] bg-[#1A1A1A]'
                        : 'border-[#1A1A1A] bg-[#111111]'
                  }`}
                >
                  {/* Rank */}
                  <span className={`text-sm font-bold ${rank.color}`}>
                    {rank.label}
                  </span>

                  {/* Case info */}
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">
                      {entry.suspect_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {entry.case_setting}
                    </p>
                  </div>

                  {/* Score */}
                  <p className={`text-sm font-bold text-right ${i === 0 ? 'text-[#C8A050]' : 'text-[#E8E8E8]'}`}>
                    {entry.score.toLocaleString()}
                  </p>

                  {/* Time remaining */}
                  <p className="text-sm text-gray-400 text-right">
                    {formatTime(entry.time_remaining)}
                  </p>

                  {/* Rating */}
                  <p className={`text-xs font-bold text-right ${ratingColor(entry.detective_rating)}`}>
                    {entry.detective_rating}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Score breakdown legend */}
        {entries.length > 0 && (
          <div className="mt-10 p-4 bg-[#111111] border border-[#1A1A1A] rounded-sm">
            <p className="text-xs uppercase tracking-wider text-gray-600 mb-3">Scoring</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-500">
              <span>Time left &times; 100</span>
              <span>Clues &times; 200</span>
              <span>Hints &times; -150</span>
              <span>Accusations &times; -300</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-center mt-12">
          <button
            onClick={() => router.push('/cases')}
            className="px-8 py-4 bg-[#C41E1E] text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
          >
            PLAY
          </button>
          <button
            onClick={() => router.push('/')}
            className="px-8 py-4 bg-[#2A2A2A] text-white font-bold rounded-lg hover:bg-[#3A3A3A] transition-colors"
          >
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  );
}
