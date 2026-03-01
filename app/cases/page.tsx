'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { BackButton } from '../components/ui';
import { CASES, DIFFICULTY_CONFIG } from '../data/cases';
import { getCaseStats, type CaseStats } from '../data/case-history';
import { motion, PageMotion, fadeIn, fadeUp, smooth } from '../components/motion';
import PolaroidCard from './PolaroidCard';

export default function CaseSelectPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const [solvedCases, setSolvedCases] = useState<string[]>([]);
  const [stats, setStats] = useState<CaseStats | null>(null);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    try { setSolvedCases(JSON.parse(localStorage.getItem('solvedCases') || '[]')); } catch {}
    try { setStats(getCaseStats()); } catch {}
  }, []);

  const go = useCallback((dir: number) => {
    setExpanded(false);
    setDirection(dir);
    setCurrent((prev) => { const next = prev + dir; if (next < 0) return CASES.length - 1; if (next >= CASES.length) return 0; return next; });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'Enter') { const c = CASES[current]; router.push(`/game?setting=${encodeURIComponent(c.setting)}&difficulty=${c.difficulty}`); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, go, router]);

  const getOffset = (i: number) => ((i - current) % CASES.length + CASES.length + Math.floor(CASES.length / 2)) % CASES.length - Math.floor(CASES.length / 2);
  const rotations = [-3, 2.5, -1.5, 4, -2, 3.5, -4];

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0" style={{ backgroundImage: 'url(/detective/desk.png)', backgroundSize: '90%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundColor: '#000' }} />
      <svg className="absolute w-0 h-0"><defs><filter id="sticky-wrinkle"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" seed="5" result="noise" /><feDiffuseLighting in="noise" lightingColor="white" surfaceScale="1.5" result="light"><feDistantLight azimuth="45" elevation="55" /></feDiffuseLighting><feComposite in="SourceGraphic" in2="light" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" /></filter></defs></svg>
      <div className="absolute inset-0 bg-black/30" />
      <motion.div className="absolute inset-0 pointer-events-none" animate={{ opacity: [0, 0.15, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)' }} />

      <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={smooth}><BackButton /></motion.div>

      <PageMotion>
        <div className="relative z-10 flex flex-col items-center min-h-screen px-4 pb-6">
          <div className="flex-[0.55]" />
          <motion.div className="text-center mb-2" variants={fadeUp} initial="hidden" animate="visible" transition={smooth}>
            <motion.p className="text-xs uppercase tracking-[0.3em] text-accent mb-1" animate={{ opacity: [1, 1, 0.7, 1, 1, 0.85, 1], textShadow: ['0 0 4px rgba(196,30,30,0.3)', '0 0 8px rgba(196,30,30,0.5)', '0 0 2px rgba(196,30,30,0.1)', '0 0 10px rgba(196,30,30,0.6)', '0 0 4px rgba(196,30,30,0.3)', '0 0 6px rgba(196,30,30,0.4)', '0 0 4px rgba(196,30,30,0.3)'] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>Select Case</motion.p>
            <motion.h1 className="text-2xl sm:text-3xl font-bold tracking-wide text-foreground" animate={{ textShadow: ['0 0 0px transparent', '0 0 20px rgba(232,232,232,0.15)', '0 0 0px transparent'] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>CHOOSE YOUR CASE</motion.h1>
          </motion.div>

          {stats && (
            <motion.div className="flex items-center gap-4 mb-3 text-[10px] text-gray-400 uppercase tracking-wider" variants={fadeUp} initial="hidden" animate="visible" transition={{ ...smooth, delay: 0.1 }}>
              <span>{stats.totalPlayed} played</span><span className="text-gray-600">|</span><span>{stats.winRate}% win rate</span>
              {stats.bestScore !== null && (<><span className="text-gray-600">|</span><span>Best: <span className="text-gold">{stats.bestScore.toLocaleString()}</span></span></>)}
            </motion.div>
          )}

          <div className="relative w-full max-w-lg h-[380px] sm:h-[420px] flex items-center justify-center -mt-32">
            {[[-1, 'left-0 sm:-left-10', [0, -4, 0], '-scale-x-100'], [1, 'right-0 sm:-right-10', [0, 4, 0], '']].map(([dir, pos, anim, flip]) => (
              <motion.button key={String(dir)} onClick={() => go(dir as number)} className={`group/arrow absolute ${pos} top-1/2 translate-y-0 z-30 w-14 h-14 flex items-center justify-center active:scale-90 transition-all drop-shadow-lg`} animate={{ x: anim as number[] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.85 }}>
                <img src="/ui/arrow_right.png" alt="" className={`w-10 h-10 ${flip} group-active/arrow:brightness-50 group-active/arrow:sepia group-active/arrow:saturate-200 group-active/arrow:hue-rotate-[-20deg] transition-all`} style={{ imageRendering: 'pixelated' }} />
              </motion.button>
            ))}

            {CASES.map((caseItem, i) => {
              const offset = getOffset(i);
              const isActive = offset === 0;
              const absOffset = Math.abs(offset);
              if (absOffset > 3) return null;
              const baseRotation = rotations[i % rotations.length];
              return (
                <PolaroidCard key={caseItem.id} caseData={caseItem} isActive={isActive} expanded={expanded && isActive} isSolved={solvedCases.includes(caseItem.id)} index={i}
                  fanX={offset * 18} fanY={isActive ? 0 : absOffset * 4} fanRotate={isActive ? 0 : baseRotation + offset * 3} fanScale={isActive ? 1 : 1 - absOffset * 0.04} zIndex={isActive ? 20 : 10 - absOffset} opacity={absOffset > 2 ? 0.3 : absOffset > 1 ? 0.6 : 1}
                  onClick={() => { if (isActive) setExpanded(!expanded); else { setExpanded(false); setDirection(offset > 0 ? 1 : -1); setCurrent(i); } }}
                />
              );
            })}
          </div>

          <div className="flex items-center gap-2 mt-14">
            {CASES.map((_, i) => (
              <motion.button key={i} onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }} className={`h-2 rounded-full transition-all ${i === current ? 'bg-accent w-4' : 'bg-white/50 hover:bg-white/80 w-2'}`}
                animate={i === current ? { boxShadow: ['0 0 0px rgba(196,30,30,0)', '0 0 8px rgba(196,30,30,0.6)', '0 0 0px rgba(196,30,30,0)'] } : { boxShadow: '0 0 0px rgba(196,30,30,0)' }}
                transition={i === current ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}} layout
              />
            ))}
          </div>

          <motion.p className="mt-3 text-[10px] text-white/60 uppercase tracking-wider" variants={fadeIn} initial="hidden" animate="visible" transition={{ ...smooth, delay: 0.3 }}>Click photo to play &middot; Arrow keys to browse</motion.p>
        </div>
      </PageMotion>
    </div>
  );
}
