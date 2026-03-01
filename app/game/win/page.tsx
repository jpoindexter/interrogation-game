'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Spinner } from '../../components/ui';
import { formatTime, shareResult } from '../components/utils';
import InitialsEntry from './InitialsEntry';
import TranscriptViewer from '../components/TranscriptViewer';
import ScoreBreakdown from './ScoreBreakdown';
import CaseDetails from './CaseDetails';
import { saveCaseResult } from '../../data/case-history';

import { playClick, playSfx } from '../../lib/sfx-utils';

interface GameResult {
  caseData: { case_number: string; suspect_name: string; suspect_role: string; setting: string; crime: string };
  sessionId?: string;
  winToken?: string;
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
  easy: { parTime: 240, multiplier: 1.0, label: 'Easy' },
  medium: { parTime: 360, multiplier: 1.5, label: 'Medium' },
  hard: { parTime: 480, multiplier: 2.0, label: 'Hard' },
  expert: { parTime: 600, multiplier: 2.5, label: 'Expert' },
};

function getRating(score: number): string {
  if (score >= 2000) return 'Legendary';
  if (score >= 1200) return 'Veteran';
  if (score >= 800) return 'Sharp';
  if (score >= 400) return 'Rookie';
  return 'Trainee';
}

function computeBreakdown(result: GameResult) {
  const diff = DIFFICULTY_CONFIG[result.difficulty] || DIFFICULTY_CONFIG.medium;
  const timeRatio = Math.max(0, 1 - result.timeElapsed / (diff.parTime * 2));
  const timeScore = Math.round(1000 * Math.sqrt(timeRatio));
  const hintsUsed = result.hintsUsed ?? 0;
  const hintMultiplier = Math.pow(0.85, hintsUsed);
  const wrongAccusations = Math.max(0, (result.accusationsUsed ?? 1) - 1);
  const accusationMultiplier = Math.max(0, 1 - wrongAccusations * 0.1);
  const finalScore = Math.round(Math.max(0, timeScore * diff.multiplier * hintMultiplier * accusationMultiplier));
  return { timeScore, diffMultiplier: diff.multiplier, diff, hintsUsed, hintMultiplier, wrongAccusations, accusationMultiplier, finalScore };
}

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const staggerChildren = { visible: { transition: { staggerChildren: 0.15 } } };

export default function WinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-foreground font-mono flex items-center justify-center"><Spinner /></div>}>
      <WinContent />
    </Suspense>
  );
}

function WinContent() {
  const router = useRouter();
  const [result, setResult] = useState<GameResult | null>(null);
  const [stampVisible, setStampVisible] = useState(false);
  const [evaluation, setEvaluation] = useState<{ detective_rating: string; reveal_the_lie: string; reveal_the_truth: string; reveal_the_clue: string; explanation: string } | null>(null);
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
  const totalRef = useRef<HTMLDivElement>(null);

  const fallbackEval = { detective_rating: 'Sharp', reveal_the_lie: 'Unable to retrieve.', reveal_the_truth: 'Unable to retrieve.', reveal_the_clue: 'Unable to retrieve.', explanation: 'You identified the contradiction in the suspect\'s story.' };

  useEffect(() => {
    const stored = sessionStorage.getItem('gameResult');
    if (!stored) { router.push('/'); return; }
    let parsed: GameResult;
    try { parsed = JSON.parse(stored) as GameResult; } catch { router.push('/'); return; }
    setResult(parsed);
    setTimeout(() => {
      setStampVisible(true);
      playSfx('/efx/stampthud.mp3', 0.3);
      setTimeout(() => playSfx('/efx/handcuff.mp3', 0.25), 800);
    }, 300);

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
      if (!solved.includes(solvedId)) localStorage.setItem('solvedCases', JSON.stringify([...solved, solvedId]));
    } catch {}

    try {
      const b = computeBreakdown(parsed);
      saveCaseResult({ setting: parsed.caseData.setting || '', won: true, score: b.finalScore, difficulty: parsed.difficulty || 'medium', timestamp: Date.now() });
    } catch {}

    fetch('/api/evaluate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'win', sessionId: parsed.sessionId, playerAccusation: parsed.conversationHistory.filter((m) => m.role === 'user').pop()?.content ?? '' }) })
      .then((res) => res.json())
      .then((data) => setEvaluation(data.error ? fallbackEval : data))
      .catch(() => setEvaluation(fallbackEval));
  }, [router]);

  const breakdown = result ? computeBreakdown(result) : null;

  useEffect(() => {
    if (!result) return;
    const target = result.timeElapsed;
    const start = performance.now();
    const animate = (now: number) => {
      const p = Math.min((now - start) / 1500, 1);
      setDisplayTime(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) timeFrameRef.current = requestAnimationFrame(animate);
    };
    timeFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(timeFrameRef.current);
  }, [result?.timeElapsed]);

  useEffect(() => {
    if (!result || !breakdown) return;
    const delays = [1000, 1800, 2400, 3000, 3800];
    const timers = delays.map((d, i) => setTimeout(() => setRevealStep(i + 1), d));
    return () => timers.forEach(clearTimeout);
  }, [result, breakdown !== null]);

  useEffect(() => {
    if (revealStep < 5 || !breakdown) return;
    const target = breakdown.finalScore;
    const start = performance.now();
    const animate = (now: number) => {
      const p = Math.min((now - start) / 1200, 1);
      setDisplayScore(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) scoreFrameRef.current = requestAnimationFrame(animate);
    };
    scoreFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(scoreFrameRef.current);
  }, [revealStep, breakdown?.finalScore]);

  useEffect(() => {
    if (revealStep < 5 || playerInitials || showInitials) return;
    const el = totalRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        const timer = setTimeout(() => setShowInitials(true), 2000);
        observer.disconnect();
        return () => clearTimeout(timer);
      }
    }, { threshold: 0.8 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [revealStep, playerInitials, showInitials]);

  useEffect(() => {
    if (!result || !evaluation || leaderboardSubmitted || !playerInitials) return;
    setLeaderboardSubmitted(true);
    fetch('/api/leaderboard', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: result.sessionId, winToken: result.winToken, playerName: playerInitials, caseNumber: result.caseData.case_number, caseSetting: result.caseData.setting, suspectName: result.caseData.suspect_name, timeElapsed: result.timeElapsed, difficulty: result.difficulty, stressLevel: result.stressLevel, hintsUsed: result.hintsUsed ?? 0, accusationsUsed: result.accusationsUsed ?? 0, detectiveRating: evaluation.detective_rating }),
    }).catch(() => {});
  }, [result, evaluation, leaderboardSubmitted, playerInitials]);

  if (!result) return <div className="min-h-screen bg-black text-foreground font-mono flex items-center justify-center"><Spinner /></div>;

  const caseSetting = result.caseData.setting || '';
  const difficulty = result.difficulty || 'medium';

  return (
    <div className="min-h-screen bg-black text-foreground font-mono overflow-y-auto relative">
      <button onClick={() => { playClick(); sessionStorage.removeItem('gameResult'); router.push('/'); }} className="absolute top-6 right-6 text-xs text-gray-500 hover:text-white uppercase tracking-wider transition-colors z-20">&larr; Home</button>

      <motion.div className="absolute top-0 left-1/2 -translate-x-1/2 z-0 pointer-events-none" initial={{ opacity: 0, scale: 1.5 }} animate={stampVisible ? { opacity: 0.15, scale: 1 } : {}} transition={{ duration: 0.7, ease: 'easeOut' }}>
        <img src="/solved/caught.png" alt="" className="w-[600px] sm:w-[800px] md:w-[900px]" />
      </motion.div>
      <div className="absolute top-48 sm:top-64 left-0 right-0 h-32 z-[1] pointer-events-none bg-gradient-to-b from-transparent to-black" />

      <div className="max-w-2xl mx-auto px-6 sm:px-8 pb-6 sm:pb-8 relative z-10">
        <motion.div className="text-center pt-40 sm:pt-56 mb-8" initial="hidden" animate="visible" variants={staggerChildren}>
          <motion.p className="text-lg sm:text-xl uppercase tracking-[0.3em] text-accent font-bold mb-2" variants={fadeUp} transition={{ duration: 0.6 }}>Case #{result.caseData.case_number}</motion.p>
          <motion.p className="text-xl sm:text-2xl font-semibold text-foreground tabular-nums" variants={fadeUp} transition={{ duration: 0.6 }}>Cracked in {formatTime(displayTime)}</motion.p>
        </motion.div>

        {breakdown && <ScoreBreakdown breakdown={breakdown} timeElapsed={result.timeElapsed} revealStep={revealStep} displayScore={displayScore} totalRef={totalRef} />}
        <CaseDetails suspectName={result.caseData.suspect_name} suspectRole={result.caseData.suspect_role} confession={result.confession} evaluation={evaluation} revealStep={revealStep} />

        <motion.div className="mt-10" initial={{ opacity: 0 }} animate={revealStep >= 5 ? { opacity: 1 } : {}} transition={{ duration: 0.5, delay: 1.5 }}>
          <div className="flex flex-wrap gap-2 justify-center">
            <button onClick={() => { playClick(); sessionStorage.removeItem('gameResult'); const next = difficulty === 'easy' ? 'medium' : difficulty === 'medium' ? 'hard' : 'expert'; router.push(`/game?setting=${encodeURIComponent(caseSetting)}&difficulty=${next}`); }} className="px-5 py-2 bg-accent text-white text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-accent-hover transition-colors">Try Harder</button>
            <button onClick={() => { playClick(); sessionStorage.removeItem('gameResult'); router.push('/cases'); }} className="px-5 py-2 bg-gold text-black text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-gold-hover transition-colors">New Case</button>
            <button onClick={() => { playClick(); router.push('/leaderboard'); }} className="px-5 py-2 bg-surface text-gray-400 text-xs font-bold uppercase tracking-wider rounded-sm hover:text-foreground hover:bg-surface-hover transition-colors">Leaderboard</button>
            <button onClick={async () => { playClick(); if (!breakdown) return; const url = typeof window !== 'undefined' ? window.location.origin : ''; const text = [`\ud83d\udd0d INTERROGATION \u2014 Case #${result.caseData.case_number}`, `Cracked ${result.caseData.suspect_name} in ${formatTime(result.timeElapsed)}`, `Score: ${breakdown.finalScore.toLocaleString()} | Rating: ${getRating(breakdown.finalScore)}`, `Can you beat my score?`, url].join('\n'); const outcome = await shareResult(text); if (outcome === 'copied') { setShareLabel('COPIED!'); setTimeout(() => setShareLabel('SHARE'), 2000); } }} className="px-5 py-2 bg-surface text-gray-400 text-xs font-bold uppercase tracking-wider rounded-sm hover:text-foreground hover:bg-surface-hover transition-colors">{shareLabel}</button>
            <button onClick={() => { playClick(); setShowTranscript(true); }} className="px-5 py-2 bg-surface text-gray-400 text-xs font-bold uppercase tracking-wider rounded-sm hover:text-foreground hover:bg-surface-hover transition-colors">Transcript</button>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showTranscript && <TranscriptViewer conversationHistory={result.conversationHistory} suspectName={result.caseData.suspect_name} onClose={() => setShowTranscript(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showInitials && breakdown && (
          <InitialsEntry score={breakdown.finalScore} onSubmit={(val) => { setPlayerInitials(val); sessionStorage.setItem('newLeaderboardEntry', val); }} onViewScore={() => setShowInitials(false)} onViewLeaderboard={() => router.push('/leaderboard')} />
        )}
      </AnimatePresence>
    </div>
  );
}
