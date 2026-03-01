'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { BackButton } from '../components/ui';
import { CASES, DIFFICULTY_CONFIG } from '../data/cases';
import { getCaseStats, type CaseStats } from '../data/case-history';
import {
  motion,
  AnimatePresence,
  PageMotion,
  fadeIn,
  fadeUp,
  smooth,
} from '../components/motion';

export default function CaseSelectPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const [solvedCases, setSolvedCases] = useState<string[]>([]);
  const [stats, setStats] = useState<CaseStats | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const deskRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setSolvedCases(JSON.parse(localStorage.getItem('solvedCases') || '[]'));
    } catch { /* private browsing */ }
    try {
      setStats(getCaseStats());
    } catch { /* private browsing */ }
  }, []);

  const go = useCallback((dir: number) => {
    setExpanded(false);
    setDirection(dir);
    setCurrent((prev) => {
      const next = prev + dir;
      if (next < 0) return CASES.length - 1;
      if (next >= CASES.length) return 0;
      return next;
    });
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'Enter') {
        const c = CASES[current];
        router.push(`/game?setting=${encodeURIComponent(c.setting)}&difficulty=${c.difficulty}`);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, go, router]);

  // Mouse parallax for desk
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setMousePos({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const c = CASES[current];
  const solved = solvedCases.includes(c.id);
  const diff = DIFFICULTY_CONFIG[c.difficulty];

  // Fixed rotations per case for consistent "tossed on desk" look
  const rotations = [-3, 2.5, -1.5, 4, -2, 3.5, -4];

  // Get indices for the visible fan
  const getOffset = (i: number) => {
    const delta = ((i - current) % CASES.length + CASES.length + Math.floor(CASES.length / 2)) % CASES.length - Math.floor(CASES.length / 2);
    return delta;
  };

  // Desk parallax offset
  const deskX = (mousePos.x - 0.5) * -8;
  const deskY = (mousePos.y - 0.5) * -8;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Desk background — parallax on mouse */}
      <motion.div
        ref={deskRef}
        className="absolute -inset-4"
        animate={{ x: deskX, y: deskY }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{
          backgroundImage: 'url(/detective/desk.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {/* SVG filter for paper wrinkle texture */}
      <svg className="absolute w-0 h-0">
        <defs>
          <filter id="sticky-wrinkle">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" seed="5" result="noise" />
            <feDiffuseLighting in="noise" lightingColor="white" surfaceScale="1.5" result="light">
              <feDistantLight azimuth="45" elevation="55" />
            </feDiffuseLighting>
            <feComposite in="SourceGraphic" in2="light" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" />
          </filter>
        </defs>
      </svg>
      {/* Dark vignette overlay */}
      <div className="absolute inset-0 bg-black/30" />
      {/* Animated vignette pulse */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0, 0.15, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)',
        }}
      />

      <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={smooth}>
        <BackButton />
      </motion.div>

      <PageMotion>
        <div className="relative z-10 flex flex-col items-center min-h-screen px-4 pb-6">
          {/* Spacer to push title down */}
          <div className="flex-[0.55]" />
          {/* Title */}
          <motion.div
            className="text-center mb-2"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={smooth}
          >
            {/* Flickering neon "SELECT CASE" */}
            <motion.p
              className="text-xs uppercase tracking-[0.3em] text-accent mb-1"
              animate={{
                opacity: [1, 1, 0.7, 1, 1, 0.85, 1],
                textShadow: [
                  '0 0 4px rgba(196,30,30,0.3)',
                  '0 0 8px rgba(196,30,30,0.5)',
                  '0 0 2px rgba(196,30,30,0.1)',
                  '0 0 10px rgba(196,30,30,0.6)',
                  '0 0 4px rgba(196,30,30,0.3)',
                  '0 0 6px rgba(196,30,30,0.4)',
                  '0 0 4px rgba(196,30,30,0.3)',
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            >
              Select Case
            </motion.p>
            <motion.h1
              className="text-2xl sm:text-3xl font-bold tracking-wide text-foreground"
              animate={{
                textShadow: [
                  '0 0 0px transparent',
                  '0 0 20px rgba(232,232,232,0.15)',
                  '0 0 0px transparent',
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              CHOOSE YOUR CASE
            </motion.h1>
          </motion.div>

          {/* Stats bar */}
          {stats && (
            <motion.div
              className="flex items-center gap-4 mb-3 text-[10px] text-gray-400 uppercase tracking-wider"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={{ ...smooth, delay: 0.1 }}
            >
              <span>{stats.totalPlayed} played</span>
              <span className="text-gray-600">|</span>
              <span>{stats.winRate}% win rate</span>
              {stats.bestScore !== null && (
                <>
                  <span className="text-gray-600">|</span>
                  <span>Best: <span className="text-gold">{stats.bestScore.toLocaleString()}</span></span>
                </>
              )}
            </motion.div>
          )}

          {/* Photo fan area */}
          <div className="relative w-full max-w-lg h-[380px] sm:h-[420px] flex items-center justify-center -mt-32">
            {/* Left arrow — bouncing */}
            <motion.button
              onClick={() => go(-1)}
              className="group/arrow absolute left-0 sm:-left-10 top-1/2 translate-y-0 z-30 w-14 h-14 flex items-center justify-center active:scale-90 transition-all drop-shadow-lg"
              aria-label="Previous case"
              animate={{ x: [0, -4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.85 }}
            >
              <img
                src="/ui/arrow_right.png"
                alt=""
                className="w-10 h-10 -scale-x-100 group-active/arrow:brightness-50 group-active/arrow:sepia group-active/arrow:saturate-200 group-active/arrow:hue-rotate-[-20deg] transition-all"
                style={{ imageRendering: 'pixelated' }}
              />
            </motion.button>

            {/* Right arrow — bouncing */}
            <motion.button
              onClick={() => go(1)}
              className="group/arrow absolute right-0 sm:-right-10 top-1/2 translate-y-0 z-30 w-14 h-14 flex items-center justify-center active:scale-90 transition-all drop-shadow-lg"
              aria-label="Next case"
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.85 }}
            >
              <img
                src="/ui/arrow_right.png"
                alt=""
                className="w-10 h-10 group-active/arrow:brightness-50 group-active/arrow:sepia group-active/arrow:saturate-200 group-active/arrow:hue-rotate-[-20deg] transition-all"
                style={{ imageRendering: 'pixelated' }}
              />
            </motion.button>

            {/* Fanned photo stack */}
            {CASES.map((caseItem, i) => {
              const offset = getOffset(i);
              const isActive = offset === 0;
              const absOffset = Math.abs(offset);
              if (absOffset > 3) return null;

              const caseData = caseItem;
              const caseDiff = DIFFICULTY_CONFIG[caseData.difficulty];
              const isSolved = solvedCases.includes(caseData.id);
              const baseRotation = rotations[i % rotations.length];
              const fanX = offset * 18;
              const fanRotate = isActive ? 0 : baseRotation + offset * 3;
              const fanY = isActive ? 0 : absOffset * 4;
              const fanScale = isActive ? 1 : 1 - absOffset * 0.04;
              const zIndex = isActive ? 20 : 10 - absOffset;
              const opacity = absOffset > 2 ? 0.3 : absOffset > 1 ? 0.6 : 1;

              return (
                <motion.div
                  key={caseData.id}
                  className="absolute bottom-0"
                  animate={{
                    x: fanX,
                    y: fanY,
                    rotate: fanRotate,
                    scale: fanScale,
                    opacity,
                  }}
                  transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                  style={{ zIndex, transformOrigin: 'bottom center' }}
                >
                  {/* Floating bob on active card (disabled when expanded) */}
                  <motion.div
                    animate={isActive && !expanded ? { y: [0, -6, 0] } : { y: 0 }}
                    transition={isActive && !expanded ? { duration: 3, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
                  >
                    <button
                      onClick={() => {
                        if (isActive) {
                          setExpanded(!expanded);
                        } else {
                          setExpanded(false);
                          setDirection(offset > 0 ? 1 : -1);
                          setCurrent(i);
                        }
                      }}
                      className={`group relative cursor-pointer w-[260px] sm:w-[290px] ${isActive ? '' : 'pointer-events-auto'}`}
                    >
                      {/* Polaroid photo */}
                      <motion.div
                        className="relative p-2 pb-14"
                        style={{
                          background: 'linear-gradient(135deg, #E8E0D0 0%, #D8CFC0 40%, #E2DAC8 60%, #D5CCBB 100%)',
                          boxShadow: isActive
                            ? '3px 5px 20px rgba(0,0,0,0.7), 1px 2px 4px rgba(0,0,0,0.3), inset 0 0 30px rgba(0,0,0,0.05)'
                            : '2px 3px 10px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.03)',
                        }}
                        animate={isActive && expanded ? { scale: 1.08 } : { scale: 1 }}
                        whileHover={isActive && !expanded ? { scale: 1.03, rotate: 1 } : {}}
                        transition={expanded ? { duration: 0.35, type: 'spring', damping: 20 } : { duration: 0.15 }}
                      >
                        {/* Worn edge effects */}
                        <div className="absolute inset-0 pointer-events-none" style={{
                          background: 'linear-gradient(45deg, transparent 48%, rgba(0,0,0,0.03) 49%, rgba(0,0,0,0.03) 51%, transparent 52%)',
                        }} />
                        <div className="absolute top-0 right-0 w-6 h-6 pointer-events-none" style={{
                          background: 'linear-gradient(225deg, rgba(0,0,0,0.08) 0%, transparent 60%)',
                        }} />

                        {/* Scene image */}
                        <div className="relative overflow-hidden" style={{ aspectRatio: '3 / 2' }}>
                          <div
                            className={`absolute inset-0 ${isActive ? 'transition-transform duration-500 group-hover:scale-105' : ''}`}
                            style={{
                              backgroundImage: `url(${caseData.bg})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              imageRendering: 'pixelated',
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />

                          {/* Difficulty badge — active only, animated in */}
                          {isActive && (
                            <motion.div
                              className="absolute top-2 left-2"
                              initial={{ x: -20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: 0.2, duration: 0.3 }}
                            >
                              <span
                                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm"
                                style={{ backgroundColor: caseDiff.color, color: '#000' }}
                              >
                                {caseDiff.label}
                              </span>
                            </motion.div>
                          )}

                          {/* Stars — active only, staggered twinkle */}
                          {isActive && (
                            <div className="absolute top-2 right-2 flex items-center gap-0.5">
                              {[...Array(5)].map((_, si) => (
                                <motion.img
                                  key={si}
                                  src={si < caseDiff.stars ? '/ui/star_filled.png' : '/ui/star_empty.png'}
                                  alt=""
                                  className="w-3.5 h-3.5"
                                  style={{ imageRendering: 'pixelated' }}
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{
                                    scale: 1,
                                    rotate: 0,
                                    ...(si < caseDiff.stars ? {
                                      filter: [
                                        'brightness(1)',
                                        'brightness(1.5)',
                                        'brightness(1)',
                                      ],
                                    } : {}),
                                  }}
                                  transition={{
                                    scale: { delay: 0.1 + si * 0.08, duration: 0.3, type: 'spring' },
                                    rotate: { delay: 0.1 + si * 0.08, duration: 0.3 },
                                    filter: si < caseDiff.stars ? { delay: 0.5 + si * 0.15, duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : undefined,
                                  }}
                                />
                              ))}
                            </div>
                          )}

                          {/* Solved stamp — animated slam */}
                          {isSolved && (
                            <motion.div
                              className="absolute inset-0 flex items-center justify-center"
                              initial={{ scale: 2, opacity: 0, rotate: -30 }}
                              animate={{ scale: 1, opacity: 0.7, rotate: -12 }}
                              transition={{ duration: 0.4, type: 'spring', damping: 12 }}
                            >
                              <img src="/solved/case_closed.png" alt="Solved" className="w-28" />
                            </motion.div>
                          )}
                        </div>

                        {/* Polaroid bottom strip — case info */}
                        <div className="absolute bottom-0 left-0 right-0 h-12 flex items-center justify-center px-3">
                          <div className="text-center">
                            <h2 className={`text-sm font-bold tracking-wider ${isActive ? 'text-gray-800 group-hover:text-accent transition-colors' : 'text-gray-700'}`}>
                              {caseData.title}
                            </h2>
                            {isActive && !expanded && (
                              <motion.p
                                className="text-[9px] text-gray-500 uppercase tracking-wider"
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15, duration: 0.3 }}
                              >
                                {caseData.subtitle}
                              </motion.p>
                            )}
                          </div>
                        </div>
                      </motion.div>

                      {/* Expanded description panel */}
                      <AnimatePresence>
                        {isActive && expanded && (
                          <motion.div
                            initial={{ opacity: 0, y: -10, scaleY: 0 }}
                            animate={{ opacity: 1, y: 0, scaleY: 1 }}
                            exit={{ opacity: 0, y: -10, scaleY: 0 }}
                            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                            className="mt-2 origin-top"
                          >
                            <div
                              className="relative p-4 text-left"
                              style={{
                                background: `linear-gradient(180deg, ${
                                  ['#F5E6A3,#EDD98B', '#FFB3B3,#F5A0A0', '#A3D5F5,#8DC8EE', '#B3F5B3,#9BE89B', '#F5C8A3,#EEB88D', '#D5A3F5,#C88DEE', '#F5A3D5,#EE8DC8'][i % 7]
                                    .split(',').map((c, ci) => `${c} ${ci * 100}%`).join(', ')
                                })`,
                                boxShadow: '2px 3px 12px rgba(0,0,0,0.4), inset 0 0 30px rgba(0,0,0,0.03)',
                                transform: `rotate(${[1, -1.5, 2, -1, 1.5, -2, 0.5][i % 7]}deg)`,
                                filter: 'url(#sticky-wrinkle)',
                              }}
                            >
                              {/* Crease lines */}
                              <div className="absolute inset-0 pointer-events-none" style={{
                                background: 'linear-gradient(130deg, transparent 35%, rgba(0,0,0,0.06) 35.5%, transparent 36%), linear-gradient(60deg, transparent 50%, rgba(255,255,255,0.1) 50.5%, transparent 51%), linear-gradient(165deg, transparent 65%, rgba(0,0,0,0.04) 65.5%, transparent 66%)',
                              }} />
                              {/* Sticky tape at top */}
                              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-12 h-5 pointer-events-none z-10" style={{
                                background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.15) 100%)',
                                borderRadius: '1px',
                              }} />
                              {/* Corner curl shadow */}
                              <div className="absolute bottom-0 right-0 w-6 h-6 pointer-events-none" style={{
                                background: 'linear-gradient(315deg, rgba(0,0,0,0.12) 0%, transparent 60%)',
                              }} />
                              <p className="text-[11px] text-gray-800 leading-relaxed mb-3" style={{ fontFamily: 'inherit' }}>
                                {caseData.description}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] text-gray-600 uppercase tracking-wider font-bold">
                                  {caseDiff.label} &middot; {caseDiff.clues} clues to find
                                </span>
                                <motion.span
                                  className="text-[10px] font-bold text-accent uppercase tracking-wider cursor-pointer hover:text-red-500 transition-colors px-2 py-1 -mr-2"
                                  animate={{ opacity: [1, 0.5, 1] }}
                                  transition={{ duration: 1.5, repeat: Infinity }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/game?setting=${encodeURIComponent(caseData.setting)}&difficulty=${caseData.difficulty}`);
                                  }}
                                >
                                  PLAY &rarr;
                                </motion.span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>

          {/* Dots indicator */}
          <div className="flex items-center gap-2 mt-14">
            {CASES.map((_, i) => (
              <motion.button
                key={i}
                onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
                className={`h-2 rounded-full transition-all ${
                  i === current ? 'bg-accent w-4' : 'bg-white/50 hover:bg-white/80 w-2'
                }`}
                aria-label={`Case ${i + 1}`}
                animate={i === current ? {
                  boxShadow: [
                    '0 0 0px rgba(196,30,30,0)',
                    '0 0 8px rgba(196,30,30,0.6)',
                    '0 0 0px rgba(196,30,30,0)',
                  ],
                } : { boxShadow: '0 0 0px rgba(196,30,30,0)' }}
                transition={i === current ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
                layout
              />
            ))}
          </div>

          {/* Play hint */}
          <motion.p
            className="mt-3 text-[10px] text-white/60 uppercase tracking-wider"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            transition={{ ...smooth, delay: 0.3 }}
          >
            Click photo to play &middot; Arrow keys to browse
          </motion.p>
        </div>
      </PageMotion>
    </div>
  );
}
