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

// Seed data — time_remaining stores elapsed seconds (lower = faster)
// Score: sqrt curve × difficulty multiplier × hint/accusation penalties
const SEED_ENTRIES: LeaderboardEntry[] = [
  { player_name: 'DetectiveNoir', case_setting: 'Police Precinct', suspect_name: 'Sgt. Marcus Webb', time_remaining: 240, detective_rating: 'Legendary', score: 2384, clues_found: 5, hints_used: 0, accusations_used: 1, created_at: '2026-02-28T09:12:00Z' },
  { player_name: 'ColdCase_King', case_setting: 'Trading Floor', suspect_name: 'Elena Marchetti', time_remaining: 180, detective_rating: 'Legendary', score: 2062, clues_found: 4, hints_used: 0, accusations_used: 1, created_at: '2026-02-28T08:45:00Z' },
  { player_name: 'TruthSeeker', case_setting: 'Tech Company', suspect_name: 'Raj Patel', time_remaining: 300, detective_rating: 'Veteran', score: 1530, clues_found: 4, hints_used: 1, accusations_used: 1, created_at: '2026-02-28T07:30:00Z' },
  { player_name: 'BadCopGoodCop', case_setting: 'Hospital', suspect_name: 'Dr. Linda Zhao', time_remaining: 240, detective_rating: 'Veteran', score: 1275, clues_found: 3, hints_used: 0, accusations_used: 2, created_at: '2026-02-28T06:15:00Z' },
  { player_name: 'Interrogator_X', case_setting: 'Law Firm', suspect_name: 'James Whitfield', time_remaining: 280, detective_rating: 'Sharp', score: 1060, clues_found: 3, hints_used: 1, accusations_used: 1, created_at: '2026-02-27T22:00:00Z' },
  { player_name: 'LieDetector99', case_setting: 'Corporate Office', suspect_name: 'Karen Sullivan', time_remaining: 180, detective_rating: 'Sharp', score: 866, clues_found: 2, hints_used: 0, accusations_used: 1, created_at: '2026-02-27T20:30:00Z' },
  { player_name: 'NightShift', case_setting: 'Startup', suspect_name: 'Tyler Brooks', time_remaining: 200, detective_rating: 'Sharp', score: 764, clues_found: 2, hints_used: 1, accusations_used: 1, created_at: '2026-02-27T19:00:00Z' },
  { player_name: 'Columbo_Jr', case_setting: 'Police Precinct', suspect_name: 'Officer Diane Holt', time_remaining: 520, detective_rating: 'Rookie', score: 614, clues_found: 5, hints_used: 2, accusations_used: 2, created_at: '2026-02-27T17:45:00Z' },
  { player_name: 'QuietRoom', case_setting: 'Trading Floor', suspect_name: 'Victor Tan', time_remaining: 600, detective_rating: 'Rookie', score: 478, clues_found: 4, hints_used: 3, accusations_used: 2, created_at: '2026-02-27T16:00:00Z' },
  { player_name: 'FirstTimer', case_setting: 'Startup', suspect_name: 'Amy Chen', time_remaining: 380, detective_rating: 'Trainee', score: 312, clues_found: 2, hints_used: 3, accusations_used: 3, created_at: '2026-02-27T14:30:00Z' },
];

export default function LeaderboardPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then((res) => res.json())
      .then((data) => {
        const real = data.leaderboard ?? [];
        const merged = [...real, ...SEED_ENTRIES]
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);
        setEntries(merged);
        setLoading(false);
      })
      .catch(() => {
        setEntries(SEED_ENTRIES);
        setLoading(false);
      });
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
    <div className="min-h-screen bg-black text-[#E8E8E8] font-mono relative">
      <button
        onClick={() => router.push('/')}
        className="absolute top-6 right-6 text-xs text-gray-500 hover:text-white uppercase tracking-wider transition-colors z-20"
      >
        &larr; Home
      </button>
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
              <span>Speed &times; difficulty</span>
              <span>Hints &minus;15% each</span>
              <span>Wrong acc. &minus;10% each</span>
              <span>Harder = more pts</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
