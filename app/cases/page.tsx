'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string; clues: number; stars: number }> = {
  easy: { label: 'EASY', color: '#4CAF50', clues: 2, stars: 1 },
  medium: { label: 'MEDIUM', color: '#F59E0B', clues: 3, stars: 2 },
  hard: { label: 'HARD', color: '#C41E1E', clues: 4, stars: 3 },
  expert: { label: 'EXPERT', color: '#9333EA', clues: 5, stars: 5 },
};

const CASES = [
  {
    id: 'startup',
    title: 'STARTUP',
    subtitle: 'Fraud, stolen code, faked metrics',
    bg: '/bg/startup.png',
    setting: 'startup',
    difficulty: 'easy',
  },
  {
    id: 'office',
    title: 'CORPORATE OFFICE',
    subtitle: 'Embezzlement, fraud, cover-ups',
    bg: '/bg/office.png',
    setting: 'corporate office',
    difficulty: 'easy',
  },
  {
    id: 'medical',
    title: 'HOSPITAL',
    subtitle: 'Record falsification, malpractice cover-up',
    bg: '/bg/medical.png',
    setting: 'hospital or medical facility',
    difficulty: 'medium',
  },
  {
    id: 'lawfirm',
    title: 'LAW FIRM',
    subtitle: 'Evidence tampering, witness fraud',
    bg: '/bg/lawfirm.png',
    setting: 'law firm',
    difficulty: 'medium',
  },
  {
    id: 'server',
    title: 'TECH COMPANY',
    subtitle: 'Data theft, sabotage, IP leaks',
    bg: '/bg/server.png',
    setting: 'tech company',
    difficulty: 'hard',
  },
  {
    id: 'trade',
    title: 'TRADING FLOOR',
    subtitle: 'Insider trading, market manipulation',
    bg: '/bg/trade.png',
    setting: 'bank or financial trading firm',
    difficulty: 'hard',
  },
  {
    id: 'police',
    title: 'POLICE PRECINCT',
    subtitle: 'Corruption, planted evidence, internal affairs',
    bg: '/bg/police.png',
    setting: 'police precinct',
    difficulty: 'expert',
  },
];

export default function CaseSelectPage() {
  const router = useRouter();
  const [solvedCases, setSolvedCases] = useState<string[]>([]);

  useEffect(() => {
    const solved = JSON.parse(localStorage.getItem('solvedCases') || '[]');
    setSolvedCases(solved);
  }, []);

  const selectCase = (setting: string, difficulty: string) => {
    router.push(`/game?setting=${encodeURIComponent(setting)}&difficulty=${difficulty}`);
  };

  return (
    <div className="min-h-screen bg-black text-[#E8E8E8] font-mono relative">
      <button
        onClick={() => router.push('/')}
        className="absolute top-6 right-6 text-xs text-gray-500 hover:text-white uppercase tracking-wider transition-colors z-20"
      >
        &larr; Home
      </button>
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-[#C41E1E] mb-2">
            Select Location
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-wide">CHOOSE YOUR CASE</h1>
        </div>

        {/* Case grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CASES.map((c) => {
            const solved = solvedCases.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => selectCase(c.setting, c.difficulty)}
                className="group relative overflow-hidden rounded-sm border border-[#2A2A2A] hover:border-[#C41E1E] transition-all text-left"
                style={{ aspectRatio: '16 / 10' }}
              >
                {/* Background image */}
                <div
                  className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
                  style={{
                    backgroundImage: `url(${c.bg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    imageRendering: 'pixelated',
                  }}
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 group-hover:from-black/80 transition-colors" />
                {/* Difficulty stars */}
                <div className="absolute top-3 left-3 flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <img
                      key={i}
                      src={i < DIFFICULTY_CONFIG[c.difficulty].stars ? '/ui/star_filled.png' : '/ui/star_empty.png'}
                      alt=""
                      className="w-4 h-4"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  ))}
                </div>
                {/* Solved stamp */}
                {solved && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img
                      src="/solved/case_closed.png"
                      alt="Solved"
                      className="w-28 opacity-70 -rotate-12"
                    />
                  </div>
                )}
                {/* Text */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h2 className="text-lg font-bold tracking-wider mb-1 group-hover:text-[#C41E1E] transition-colors">
                    {c.title}
                  </h2>
                  <p className="text-xs text-gray-400">{c.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Desk props — decorative bottom bar */}
        <div className="mt-8 flex items-center justify-between opacity-40">
          <div className="flex items-center gap-3">
            <img
              src="/ui/recorder.png"
              alt=""
              className="w-10 h-10 object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">
              {CASES.length} cases available
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">
              {solvedCases.length} / {CASES.length} solved
            </span>
            <img
              src="/clues/clue1.png"
              alt=""
              className="w-8 h-8 object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
