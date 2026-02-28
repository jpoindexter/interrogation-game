'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Spinner } from '../../components/ui';
import { formatTime, shareResult } from '../components/utils';
import InitialsEntry from './InitialsEntry';
import TranscriptViewer from '../components/TranscriptViewer';
import { saveCaseResult } from '../../data/case-history';

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
  timeElapsed: number;
  difficulty: string;
  stressLevel: number;
  cluesFound?: number;
  hintsUsed?: number;
  accusationsUsed?: number;
}

const DIFFICULTY_CONFIG: Record<string, { parTime: number; multiplier: number; label: string }> = {
  easy:   { parTime: 240, multiplier: 1.0, label: 'Easy' },
  medium: { parTime: 360, multiplier: 1.5, label: 'Medium' },
  hard:   { parTime: 480, multiplier: 2.0, label: 'Hard' },
  expert: { parTime: 600, multiplier: 2.5, label: 'Expert' },
};

function getRating(score: number): string {
  if (score >= 2000) return 'Legendary';
  if (score >= 1200) return 'Veteran';
  if (score >= 800) return 'Sharp';
  if (score >= 400) return 'Rookie';
  return 'Trainee';
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerChildren = {
  visible: { transition: { staggerChildren: 0.15 } },
};

export default function WinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-foreground font-mono flex items-center justify-center"><Spinner /></div>}>
      <WinContent />
    </Suspense>
  );
}

function WinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<GameResult | null>(null);
  const [stampVisible, setStampVisible] = useState(false);
  const [evaluation, setEvaluation] = useState<{
    detective_rating: string;
    reveal_the_lie: string;
    reveal_the_truth: string;
    reveal_the_clue: string;
    explanation: string;
  } | null>(null);

  // Animation state
  const [revealStep, setRevealStep] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [displayTime, setDisplayTime] = useState(0);
  const [leaderboardSubmitted, setLeaderboardSubmitted] = useState(false);
  const [playerInitials, setPlayerInitials] = useState<string | null>(null);
  const [showInitials, setShowInitials] = useState(false);
  const [shareLabel, setShareLabel] = useState('SHARE');
  const [showTranscript, setShowTranscript] = useState(false);
  const scoreFrameRef = useRef<number>(0);
  const timeFrameRef = useRef<number>(0);

  useEffect(() => {
    const stored = sessionStorage.getItem('gameResult');
    if (!stored) { router.push('/'); return; }

    const parsed = JSON.parse(stored) as GameResult;
    setResult(parsed);

    setTimeout(() => setStampVisible(true), 300);

    // Track solved case
    try {
      const s = (parsed.caseData.setting || '').toLowerCase();
      let solvedId = 'random';
      if (s.includes('hospital') || s.includes('medical') || s.includes('clinic')) solvedId = 'medical';
      else if (s.includes('law') || s.includes('legal') || s.includes('attorney')) solvedId = 'lawfirm';
      else if (s.includes('server') || s.includes('data center') || s.includes('tech') || s.includes('software') || s.includes('cyber')) solvedId = 'server';
      else if (s.includes('startup') || s.includes('co-working') || s.includes('incubator')) solvedId = 'startup';
      else if (s.includes('bank') || s.includes('trading') || s.includes('finance') || s.includes('hedge') || s.includes('investment') || s.includes('brokerage') || s.includes('stock')) solvedId = 'trade';
      else if (s.includes('police') || s.includes('precinct') || s.includes('station')) solvedId = 'police';
      else if (s.includes('office') || s.includes('corporate')) solvedId = 'office';
      const solved: string[] = JSON.parse(localStorage.getItem('solvedCases') || '[]');
      if (!solved.includes(solvedId)) {
        localStorage.setItem('solvedCases', JSON.stringify([...solved, solvedId]));
      }
    } catch { /* private browsing */ }

    // Track case history
    try {
      const diff = DIFFICULTY_CONFIG[parsed.difficulty] || DIFFICULTY_CONFIG.medium;
      const timeRatio = Math.max(0, 1 - parsed.timeElapsed / (diff.parTime * 2));
      const timeScore = Math.round(1000 * Math.sqrt(timeRatio));
      const hintsUsed = parsed.hintsUsed ?? 0;
      const hintMul = Math.pow(0.85, hintsUsed);
      const wrongAcc = Math.max(0, (parsed.accusationsUsed ?? 1) - 1);
      const accMul = Math.max(0, 1 - wrongAcc * 0.1);
      const score = Math.round(Math.max(0, timeScore * diff.multiplier * hintMul * accMul));
      saveCaseResult({
        setting: parsed.caseData.setting || '',
        won: true,
        score,
        difficulty: parsed.difficulty || 'medium',
        timestamp: Date.now(),
      });
    } catch { /* private browsing */ }

    fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'win',
        caseData: parsed.caseData,
        conversationHistory: parsed.conversationHistory,
        playerAccusation: parsed.conversationHistory.filter((m) => m.role === 'user').pop()?.content ?? '',
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setEvaluation(data);
        else setEvaluation({ detective_rating: 'Sharp', reveal_the_lie: parsed.caseData.the_lie, reveal_the_truth: parsed.caseData.the_truth, reveal_the_clue: parsed.caseData.the_contradiction, explanation: 'You identified the contradiction in the suspect\'s story.' });
      })
      .catch(() => {
        setEvaluation({ detective_rating: 'Sharp', reveal_the_lie: parsed.caseData.the_lie, reveal_the_truth: parsed.caseData.the_truth, reveal_the_clue: parsed.caseData.the_contradiction, explanation: 'You identified the contradiction in the suspect\'s story.' });
      });
  }, [router]);

  // Score breakdown
  const breakdown = result ? (() => {
    const diff = DIFFICULTY_CONFIG[result.difficulty] || DIFFICULTY_CONFIG.medium;
    const timeRatio = Math.max(0, 1 - result.timeElapsed / (diff.parTime * 2));
    const timeScore = Math.round(1000 * Math.sqrt(timeRatio));
    const diffMultiplier = diff.multiplier;
    const hintsUsed = result.hintsUsed ?? 0;
    const hintMultiplier = Math.pow(0.85, hintsUsed);
    const wrongAccusations = Math.max(0, (result.accusationsUsed ?? 1) - 1);
    const accusationMultiplier = Math.max(0, 1 - wrongAccusations * 0.1);
    const finalScore = Math.round(Math.max(0, timeScore * diffMultiplier * hintMultiplier * accusationMultiplier));
    return { timeScore, diffMultiplier, diff, hintsUsed, hintMultiplier, wrongAccusations, accusationMultiplier, finalScore };
  })() : null;

  // Timer count-up
  useEffect(() => {
    if (!result) return;
    const target = result.timeElapsed;
    const duration = 1500;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayTime(Math.round(target * eased));
      if (progress < 1) timeFrameRef.current = requestAnimationFrame(animate);
    };
    timeFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(timeFrameRef.current);
  }, [result?.timeElapsed]);

  // Staggered score line reveals
  useEffect(() => {
    if (!result || !breakdown) return;
    const delays = [1000, 1800, 2400, 3000, 3800];
    const timers = delays.map((delay, i) =>
      setTimeout(() => setRevealStep(i + 1), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [result, breakdown !== null]);

  // Animate score counter on final reveal
  useEffect(() => {
    if (revealStep < 5 || !breakdown) return;
    const target = breakdown.finalScore;
    const duration = 1200;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(target * eased));
      if (progress < 1) scoreFrameRef.current = requestAnimationFrame(animate);
    };
    scoreFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(scoreFrameRef.current);
  }, [revealStep, breakdown?.finalScore]);

  // Show HIGH SCORE overlay once user has scrolled to see the total score
  const totalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (revealStep < 5 || playerInitials || showInitials) return;
    const el = totalRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Score is visible — wait a beat so they can read it
          const timer = setTimeout(() => setShowInitials(true), 2000);
          observer.disconnect();
          return () => clearTimeout(timer);
        }
      },
      { threshold: 0.8 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [revealStep, playerInitials, showInitials]);

  // Submit to leaderboard after player enters initials
  useEffect(() => {
    if (!result || !evaluation || leaderboardSubmitted || !playerInitials) return;
    setLeaderboardSubmitted(true);
    fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerName: playerInitials,
        caseNumber: result.caseData.case_number,
        caseSetting: result.caseData.setting,
        suspectName: result.caseData.suspect_name,
        timeElapsed: result.timeElapsed,
        difficulty: result.difficulty,
        stressLevel: result.stressLevel,
        hintsUsed: result.hintsUsed ?? 0,
        accusationsUsed: result.accusationsUsed ?? 0,
        detectiveRating: evaluation.detective_rating,
      }),
    }).catch(() => {});
  }, [result, evaluation, leaderboardSubmitted, playerInitials]);

  if (!result) {
    return <div className="min-h-screen bg-black text-foreground font-mono flex items-center justify-center"><Spinner /></div>;
  }

  const caseSetting = result.caseData.setting || '';
  const difficulty = result.difficulty || 'medium';

  return (
    <div className="min-h-screen bg-black text-foreground font-mono overflow-y-auto relative">
      {/* Main Menu — top right, consistent with other pages */}
      <button
        onClick={() => { sessionStorage.removeItem('gameResult'); router.push('/'); }}
        className="absolute top-6 right-6 text-xs text-gray-500 hover:text-white uppercase tracking-wider transition-colors z-20"
      >
        &larr; Home
      </button>

      {/* APPREHENDED background image */}
      <motion.div
        className="absolute top-0 left-1/2 -translate-x-1/2 z-0 pointer-events-none"
        initial={{ opacity: 0, scale: 1.5 }}
        animate={stampVisible ? { opacity: 0.15, scale: 1 } : {}}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <img
          src="/solved/caught.png"
          alt=""
          className="w-[600px] sm:w-[800px] md:w-[900px]"
          style={{ imageRendering: 'auto' }}
        />
      </motion.div>
      {/* Gradient fade */}
      <div className="absolute top-48 sm:top-64 left-0 right-0 h-32 z-[1] pointer-events-none bg-gradient-to-b from-transparent to-black" />

      <div className="max-w-2xl mx-auto px-6 sm:px-8 pb-6 sm:pb-8 relative z-10">
        {/* Case header */}
        <motion.div
          className="text-center pt-40 sm:pt-56 mb-8"
          initial="hidden"
          animate="visible"
          variants={staggerChildren}
        >
          <motion.p
            className="text-lg sm:text-xl uppercase tracking-[0.3em] text-accent font-bold mb-2"
            variants={fadeUp}
            transition={{ duration: 0.6 }}
          >
            Case #{result.caseData.case_number}
          </motion.p>
          <motion.p
            className="text-xl sm:text-2xl font-semibold text-foreground tabular-nums"
            variants={fadeUp}
            transition={{ duration: 0.6 }}
          >
            Cracked in {formatTime(displayTime)}
          </motion.p>
        </motion.div>

        {/* Score breakdown */}
        {breakdown && (
          <motion.div
            className="bg-surface-dark/80 backdrop-blur-sm rounded-sm p-6 sm:p-8 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <h2 className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-5">Score Breakdown</h2>
            <div className="space-y-3">
              {/* Time */}
              <motion.div
                className="flex justify-between items-center"
                initial={{ opacity: 0, x: -10 }}
                animate={revealStep >= 1 ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                <div>
                  <span className="text-sm text-gray-300">Time</span>
                  <span className="text-xs text-gray-500 ml-2">{formatTime(result.timeElapsed)}</span>
                </div>
                <motion.span
                  className="text-sm font-bold tabular-nums"
                  initial={{ scale: 0.5 }}
                  animate={revealStep >= 1 ? { scale: 1 } : {}}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                  {breakdown.timeScore}
                </motion.span>
              </motion.div>

              {/* Difficulty */}
              <motion.div
                className="flex justify-between items-center"
                initial={{ opacity: 0, x: -10 }}
                animate={revealStep >= 2 ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                <div>
                  <span className="text-sm text-gray-300">Difficulty</span>
                  <span className="text-xs text-gray-500 ml-2">{breakdown.diff.label}</span>
                </div>
                <motion.span
                  className="text-sm font-bold text-gold tabular-nums"
                  initial={{ scale: 0.5 }}
                  animate={revealStep >= 2 ? { scale: 1 } : {}}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                  &times;{breakdown.diffMultiplier.toFixed(1)}
                </motion.span>
              </motion.div>

              {/* Hints */}
              <motion.div
                className="flex justify-between items-center"
                initial={{ opacity: 0, x: -10 }}
                animate={revealStep >= 3 ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                <div>
                  <span className="text-sm text-gray-300">Hints used</span>
                  <span className="text-xs text-gray-500 ml-2">{breakdown.hintsUsed}</span>
                </div>
                <motion.span
                  className={`text-sm font-bold tabular-nums ${breakdown.hintsUsed > 0 ? 'text-accent' : 'text-green-500'}`}
                  initial={{ scale: 0.5 }}
                  animate={revealStep >= 3 ? { scale: 1 } : {}}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                  {breakdown.hintsUsed > 0 ? `\u2212${Math.round((1 - breakdown.hintMultiplier) * 100)}%` : 'No penalty'}
                </motion.span>
              </motion.div>

              {/* Accusations */}
              <motion.div
                className="flex justify-between items-center"
                initial={{ opacity: 0, x: -10 }}
                animate={revealStep >= 4 ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                <div>
                  <span className="text-sm text-gray-300">Wrong accusations</span>
                  <span className="text-xs text-gray-500 ml-2">{breakdown.wrongAccusations}</span>
                </div>
                <motion.span
                  className={`text-sm font-bold tabular-nums ${breakdown.wrongAccusations > 0 ? 'text-accent' : 'text-green-500'}`}
                  initial={{ scale: 0.5 }}
                  animate={revealStep >= 4 ? { scale: 1 } : {}}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                  {breakdown.wrongAccusations > 0 ? `\u2212${Math.round((1 - breakdown.accusationMultiplier) * 100)}%` : 'No penalty'}
                </motion.span>
              </motion.div>

              {/* Total */}
              <AnimatePresence>
                {revealStep >= 5 && (
                  <motion.div
                    ref={totalRef}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="border-t border-surface my-3" />
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold">Total</span>
                      <motion.span
                        className="text-3xl font-bold text-gold tabular-nums"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 12 }}
                      >
                        {displayScore.toLocaleString()}
                      </motion.span>
                    </div>
                    <motion.p
                      className="text-right text-sm text-gray-400 mt-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                    >
                      {getRating(breakdown.finalScore)}
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Confession */}
        {result.confession && (
          <motion.div
            className="bg-surface-dark/80 backdrop-blur-sm rounded-sm p-6 sm:p-8 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={revealStep >= 5 ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <h2 className="text-xs uppercase tracking-[0.3em] text-accent mb-1">{result.caseData.suspect_name}</h2>
            <p className="text-xs text-gray-500 mb-3">{result.caseData.suspect_role}</p>
            <p className="text-base leading-relaxed italic text-gray-200">&ldquo;{result.confession}&rdquo;</p>
          </motion.div>
        )}

        {/* Case breakdown */}
        {evaluation ? (
          <motion.div
            className="bg-surface-dark/80 backdrop-blur-sm rounded-sm p-6 sm:p-8 space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={revealStep >= 5 ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 1.0 }}
          >
            <div>
              <h3 className="text-xs uppercase tracking-[0.3em] text-accent mb-1">The Lie</h3>
              <p className="text-sm text-gray-300">&ldquo;{evaluation.reveal_the_lie}&rdquo;</p>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-1">The Truth</h3>
              <p className="text-sm text-gray-300">{evaluation.reveal_the_truth}</p>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-1">How You Caught It</h3>
              <p className="text-sm text-gray-400">{evaluation.reveal_the_clue}</p>
            </div>
          </motion.div>
        ) : (
          <div className="flex justify-center py-12"><Spinner /></div>
        )}

        {/* Post-game actions */}
        <motion.div
          className="mt-10 space-y-3"
          initial={{ opacity: 0 }}
          animate={revealStep >= 5 ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 1.5 }}
        >
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                sessionStorage.removeItem('gameResult');
                const nextDiff = difficulty === 'easy' ? 'medium' : difficulty === 'medium' ? 'hard' : difficulty === 'hard' ? 'expert' : 'expert';
                router.push(`/game?setting=${encodeURIComponent(caseSetting)}&difficulty=${nextDiff}`);
              }}
              className="px-8 py-4 bg-accent text-white font-bold rounded-sm hover:bg-accent-hover transition-colors text-center"
            >
              TRY HARDER
            </button>
            <button
              onClick={() => { sessionStorage.removeItem('gameResult'); router.push('/cases'); }}
              className="px-8 py-4 bg-gold text-black font-bold rounded-sm hover:bg-gold-hover transition-colors text-center"
            >
              NEW CASE
            </button>
            <button
              onClick={() => router.push('/leaderboard')}
              className="px-8 py-4 bg-surface text-foreground font-bold rounded-sm hover:bg-surface-hover transition-colors text-center"
            >
              LEADERBOARD
            </button>
            <button
              onClick={async () => {
                if (!breakdown) return;
                const url = typeof window !== 'undefined' ? window.location.origin : '';
                const text = [
                  `\ud83d\udd0d INTERROGATION \u2014 Case #${result.caseData.case_number}`,
                  `Cracked ${result.caseData.suspect_name} in ${formatTime(result.timeElapsed)}`,
                  `Score: ${breakdown.finalScore.toLocaleString()} | Rating: ${getRating(breakdown.finalScore)}`,
                  `Can you beat my score?`,
                  url,
                ].join('\n');
                const outcome = await shareResult(text);
                if (outcome === 'copied') {
                  setShareLabel('COPIED!');
                  setTimeout(() => setShareLabel('SHARE'), 2000);
                }
              }}
              className="px-8 py-4 bg-surface text-foreground font-bold rounded-sm hover:bg-surface-hover transition-colors text-center"
            >
              {shareLabel}
            </button>
            <button
              onClick={() => setShowTranscript(true)}
              className="px-8 py-4 bg-surface text-foreground font-bold rounded-sm hover:bg-surface-hover transition-colors text-center"
            >
              TRANSCRIPT
            </button>
          </div>
        </motion.div>
      </div>
      {/* Transcript overlay */}
      <AnimatePresence>
        {showTranscript && (
          <TranscriptViewer
            conversationHistory={result.conversationHistory}
            suspectName={result.caseData.suspect_name}
            onClose={() => setShowTranscript(false)}
          />
        )}
      </AnimatePresence>
      {/* HIGH SCORE overlay — arcade style, appears after user sees total score */}
      <AnimatePresence>
        {showInitials && breakdown && (
          <InitialsEntry
            score={breakdown.finalScore}
            onSubmit={(val) => {
              setPlayerInitials(val);
              sessionStorage.setItem('newLeaderboardEntry', val);
            }}
            onViewScore={() => setShowInitials(false)}
            onViewLeaderboard={() => {
              router.push('/leaderboard');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
