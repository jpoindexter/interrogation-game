'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { BackButton, PageShell, PageHeader } from '../components/ui';
import { CASES, DIFFICULTY_CONFIG } from '../data/cases';
import { getCaseStats, type CaseStats } from '../data/case-history';
import {
  motion,
  PageMotion,
  fadeIn,
  fadeUp,
  scaleIn,
  stagger,
  smooth,
  springy,
} from '../components/motion';

export default function CaseSelectPage() {
  const router = useRouter();
  const [solvedCases, setSolvedCases] = useState<string[]>([]);
  const [stats, setStats] = useState<CaseStats | null>(null);

  useEffect(() => {
    try {
      const solved = JSON.parse(localStorage.getItem('solvedCases') || '[]');
      setSolvedCases(solved);
    } catch { /* private browsing or corrupt data */ }
    try {
      setStats(getCaseStats());
    } catch { /* private browsing */ }
  }, []);

  const selectCase = (setting: string, difficulty: string) => {
    router.push(`/game?setting=${encodeURIComponent(setting)}&difficulty=${difficulty}`);
  };

  return (
    <PageShell>
      <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={smooth}>
        <BackButton />
      </motion.div>
      <PageMotion>
        <div className="max-w-6xl mx-auto px-6 py-12">
          <PageHeader label="Select Location" title="CHOOSE YOUR CASE" />

          {/* Stats bar — only visible with history */}
          {stats && (
            <motion.div
              className="flex flex-wrap items-center gap-x-6 gap-y-1 mb-6 text-xs text-gray-500 uppercase tracking-wider"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={{ ...smooth, delay: 0.15 }}
            >
              <span>{stats.totalPlayed} case{stats.totalPlayed !== 1 ? 's' : ''} played</span>
              <span className="hidden sm:inline text-gray-700">|</span>
              <span>Win rate: <span className="text-gray-400">{stats.winRate}%</span></span>
              {stats.bestScore !== null && (
                <>
                  <span className="hidden sm:inline text-gray-700">|</span>
                  <span>Best score: <span className="text-gold">{stats.bestScore.toLocaleString()}</span></span>
                </>
              )}
            </motion.div>
          )}

          {/* Case grid */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={stagger(0.07)}
            initial="hidden"
            animate="visible"
          >
            {CASES.map((c) => {
              const solved = solvedCases.includes(c.id);
              return (
                <motion.button
                  key={c.id}
                  variants={fadeUp}
                  transition={smooth}
                  whileHover={{ scale: 1.03 }}
                  onClick={() => selectCase(c.setting, c.difficulty)}
                  className="group relative overflow-hidden rounded-sm border border-surface hover:border-accent transition-all text-left"
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
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center"
                      variants={scaleIn}
                      initial="hidden"
                      animate="visible"
                      transition={springy}
                    >
                      <img
                        src="/solved/case_closed.png"
                        alt="Solved"
                        className="w-28 opacity-70 -rotate-12"
                      />
                    </motion.div>
                  )}
                  {/* Text */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h2 className="text-lg font-bold tracking-wider mb-1 group-hover:text-accent transition-colors">
                      {c.title}
                    </h2>
                    <p className="text-xs text-gray-400">{c.subtitle}</p>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>

          {/* Desk props — decorative bottom bar */}
          <motion.div
            className="mt-8 flex items-center justify-between opacity-40"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            transition={{ ...smooth, delay: 0.4 }}
          >
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
          </motion.div>
        </div>
      </PageMotion>
    </PageShell>
  );
}
