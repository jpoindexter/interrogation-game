import { useState, useEffect, useRef, useCallback } from 'react';
import type { Case } from '@/lib/game-state';
import SuspectAvatar from '../SuspectAvatar';
import { motion, AnimatePresence, fadeUp, stagger, smooth, snappy } from '../../components/motion';
import { DIFFICULTY_CONFIG } from '../../data/cases';

interface BriefingScreenProps {
  caseData: Case;
  difficulty: string;
  onStart: () => void;
  onBack: () => void;
}

function buildBriefingText(c: Case): string {
  const parts: string[] = [];
  if (c.briefing) parts.push(c.briefing);
  parts.push(`Crime: ${c.crime}.`);
  parts.push(`Cover story: ${c.suspect_cover_story}.`);
  return parts.join(' ');
}

export default function BriefingScreen({ caseData, difficulty, onStart, onBack }: BriefingScreenProps) {
  const [showBriefing, setShowBriefing] = useState(false);
  const [charIndex, setCharIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const fullText = buildBriefingText(caseData);
  const diff = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.easy;

  // Start TTS + typewriter driven by audio.currentTime
  useEffect(() => {
    if (!showBriefing) return;
    setCharIndex(0);
    setIsPlaying(true);

    let cancelled = false;
    const play = async () => {
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: fullText,
            stress: 0,
            suspectName: caseData.suspect_name,
            suspectGender: caseData.suspect_gender,
            sessionId: caseData.sessionId,
          }),
        });
        if (cancelled) return;
        if (!res.ok) throw new Error('TTS failed');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;

        // Sync typewriter to audio playback position
        const tick = () => {
          if (!audioRef.current || cancelled) return;
          const progress = audio.currentTime / audio.duration;
          setCharIndex(Math.floor(progress * fullText.length));
          rafRef.current = requestAnimationFrame(tick);
        };

        audio.onended = () => {
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          URL.revokeObjectURL(url);
          audioRef.current = null;
          setIsPlaying(false);
          setCharIndex(fullText.length);
        };
        audio.onerror = () => {
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          URL.revokeObjectURL(url);
          audioRef.current = null;
          setIsPlaying(false);
          setCharIndex(fullText.length);
        };
        await audio.play();
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        if (!cancelled) { setIsPlaying(false); setCharIndex(fullText.length); }
      }
    };
    play();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, [showBriefing]);

  const skipTypewriter = useCallback(() => {
    setCharIndex(fullText.length);
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setIsPlaying(false);
  }, [fullText.length]);

  const closeBriefing = useCallback(() => {
    setShowBriefing(false);
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setIsPlaying(false);
  }, []);

  return (
    <div className="min-h-screen text-foreground font-mono flex items-center justify-center p-8 relative overflow-hidden">
      {/* Desk background */}
      <div className="absolute inset-0" style={{ backgroundImage: 'url(/detective/desk.png)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div className="absolute inset-0 bg-black/50" />

      {/* SVG filter for paper wrinkle */}
      <svg className="absolute w-0 h-0">
        <defs>
          <filter id="paper-wrinkle">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" seed="2" result="noise" />
            <feDiffuseLighting in="noise" lightingColor="white" surfaceScale="1.5" result="light">
              <feDistantLight azimuth="45" elevation="55" />
            </feDiffuseLighting>
            <feComposite in="SourceGraphic" in2="light" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" />
          </filter>
        </defs>
      </svg>

      <button onClick={onBack} className="absolute top-6 right-6 text-xs text-gray-500 hover:text-white uppercase tracking-wider transition-colors z-20">
        &larr; Cases
      </button>

      <motion.div className="max-w-2xl text-center relative z-10" initial="hidden" animate="visible" variants={stagger(0.1)}>
        {/* Header */}
        <motion.div className="flex items-center justify-center gap-3 mb-3" variants={fadeUp} transition={smooth}>
          <p className="text-sm uppercase tracking-[0.3em] text-accent">Case #{caseData.case_number}</p>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm" style={{
            color: diff.color,
            border: `1px solid color-mix(in srgb, ${diff.color} 25%, transparent)`,
          }}>{difficulty.toUpperCase()}</span>
        </motion.div>
        <motion.h1 className="text-3xl font-bold mb-6" variants={fadeUp} transition={smooth}>BRIEFING</motion.h1>

        {/* Suspect avatar */}
        <motion.div className="flex justify-center mb-5" variants={fadeUp} transition={smooth}>
          <SuspectAvatar name={caseData.suspect_name} gender={caseData.suspect_gender} stressLevel={0} size="sm" />
        </motion.div>

        {/* 3 info stickies */}
        <motion.div className="flex justify-center gap-6 mb-6" variants={fadeUp} transition={smooth}>
          {[
            { label: 'Suspect', value: caseData.suspect_name, bg: ['#FFB3B3', '#F5A0A0'], text: 'red', rot: -3 },
            { label: 'Role', value: caseData.suspect_role, bg: ['#A3D5F5', '#8DC8EE'], text: 'blue', rot: 2 },
            { label: 'Location', value: caseData.setting, bg: ['#B3F5B3', '#9BE89B'], text: 'green', rot: -1.5 },
          ].map((s) => (
            <div key={s.label} className="relative p-4 text-center w-44 h-44 flex flex-col justify-center overflow-hidden" style={{
              background: `linear-gradient(180deg, ${s.bg[0]} 0%, ${s.bg[1]} 100%)`,
              boxShadow: '2px 3px 10px rgba(0,0,0,0.35), inset 0 0 20px rgba(0,0,0,0.03)',
              transform: `rotate(${s.rot}deg)`,
              filter: 'url(#paper-wrinkle)',
            }}>
              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'linear-gradient(125deg, transparent 30%, rgba(0,0,0,0.06) 30.5%, transparent 31%), linear-gradient(65deg, transparent 55%, rgba(255,255,255,0.1) 55.5%, transparent 56%)',
              }} />
              <p className={`text-[9px] text-${s.text}-900/60 uppercase tracking-wider mb-1 relative z-10`}>{s.label}</p>
              <p className={`${s.label === 'Location' ? 'text-sm' : 'text-lg'} text-${s.text}-950 font-bold leading-snug relative z-10`} style={{ fontFamily: 'var(--font-handwriting)' }}>{s.value}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Tape player — bottom right */}
      <motion.button
        className="absolute bottom-8 right-8 z-20 group cursor-pointer"
        onClick={() => setShowBriefing(true)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="relative">
          <img src="/ui/tape_player.png" alt="Play briefing" className="w-32 sm:w-40 drop-shadow-2xl" style={{ imageRendering: 'pixelated' }} />
          {/* Pulsing play indicator */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm border border-white/20">
              <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            </div>
          </motion.div>
        </div>
        <p className="text-[9px] text-white/50 uppercase tracking-wider mt-2 text-center group-hover:text-white/80 transition-colors">Play Briefing</p>
      </motion.button>

      {/* Briefing dialog overlay */}
      <AnimatePresence>
        {showBriefing && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70" onClick={closeBriefing} />

            {/* Dialog + leads wrapper */}
            <div className="relative flex items-start justify-center gap-5">

            {/* Legal pad */}
            <motion.div
              className="relative max-w-lg w-full rounded-sm p-6 pl-10 text-left"
              style={{
                background: 'repeating-linear-gradient(transparent, transparent 19px, rgba(100,140,180,0.2) 19px, rgba(100,140,180,0.2) 20px), linear-gradient(180deg, #F5E6A3 0%, #EDD98B 100%)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.05)',
              }}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {/* Red margin line */}
              <div className="absolute top-0 bottom-0 left-[26px] w-[1px] pointer-events-none" style={{ background: 'rgba(196,60,60,0.35)' }} />
              {/* Torn top edge */}
              <div className="absolute -top-[1px] left-0 right-0 h-[4px] pointer-events-none" style={{
                background: 'linear-gradient(180deg, rgba(139,119,70,0.4) 0%, transparent 100%)',
              }} />

              {/* Close button */}
              <button onClick={closeBriefing} className="absolute top-3 right-3 text-gray-600 hover:text-gray-900 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                {isPlaying && <div className="w-2 h-2 rounded-full bg-red-700 animate-pulse" />}
                <p className="text-xs uppercase tracking-[0.3em] text-red-800 font-bold">Case Briefing</p>
              </div>

              {/* Typewriter briefing text */}
              <p className="text-sm text-gray-800 leading-relaxed mb-4 min-h-[4rem]">
                {fullText.slice(0, charIndex)}
                {charIndex < fullText.length && (
                  <span className="inline-block w-[2px] h-[1em] bg-red-800 align-text-bottom animate-pulse ml-[1px]" />
                )}
              </p>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={closeBriefing} className="text-xs text-gray-600 hover:text-gray-900 uppercase tracking-wider transition-colors">
                    Close
                  </button>
                  {charIndex < fullText.length && (
                    <button onClick={skipTypewriter} className="text-xs text-gray-500 hover:text-gray-900 uppercase tracking-wider transition-colors">
                      Skip
                    </button>
                  )}
                </div>
                <motion.button
                  onClick={() => { skipTypewriter(); onStart(); }}
                  className="px-5 py-2 bg-accent text-white text-xs font-bold rounded hover:bg-red-700 transition-colors uppercase tracking-wider"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Begin Interrogation
                </motion.button>
              </div>
            </motion.div>

            {/* Lead stickies — right side */}
            {charIndex >= fullText.length && caseData.detective_leads && caseData.detective_leads.length > 0 && (
              <div className="hidden lg:flex flex-col gap-4 shrink-0 pt-4">
                {caseData.detective_leads.map((lead, i) => {
                  const colors = [['#FFB3B3', '#F5A0A0'], ['#A3D5F5', '#8DC8EE'], ['#B3F5B3', '#9BE89B']];
                  const rots = [12, -10, 8];
                  const offsets = ['ml-2', 'mr-6', 'ml-4'];
                  const bg = colors[i % colors.length];
                  return (
                    <motion.div
                      key={i}
                      className={`relative p-5 pt-7 w-56 min-h-[10rem] flex items-center ${offsets[i % offsets.length]}`}
                      style={{
                        background: `linear-gradient(180deg, ${bg[0]} 0%, ${bg[1]} 100%)`,
                        boxShadow: '2px 3px 10px rgba(0,0,0,0.35), inset 0 0 20px rgba(0,0,0,0.03)',
                        transform: `rotate(${rots[i % rots.length]}deg)`,
                        filter: 'url(#paper-wrinkle)',
                      }}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.15, duration: 0.3 }}
                    >
                      {/* Pin */}
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
                        <div className="w-4 h-4 rounded-full shadow-md border border-red-900" style={{
                          background: 'radial-gradient(circle at 35% 35%, #e85555, #8b1a1a)',
                        }} />
                        <div className="w-[2px] h-[3px] bg-gray-500 mx-auto -mt-[1px]" />
                      </div>
                      {/* Crease overlay */}
                      <div className="absolute inset-0 pointer-events-none" style={{
                        background: 'linear-gradient(125deg, transparent 30%, rgba(0,0,0,0.06) 30.5%, transparent 31%), linear-gradient(65deg, transparent 55%, rgba(255,255,255,0.1) 55.5%, transparent 56%)',
                      }} />
                      <p className="text-lg text-gray-800 leading-snug relative z-10" style={{ fontFamily: 'var(--font-handwriting)' }}>{lead}</p>
                    </motion.div>
                  );
                })}
              </div>
            )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
