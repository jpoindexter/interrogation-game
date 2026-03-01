import { useState, useCallback } from 'react';
import type { Case } from '@/lib/game-state';
import SuspectAvatar from '../SuspectAvatar';
import { motion, fadeUp, stagger, smooth } from '../../components/motion';
import { DIFFICULTY_CONFIG } from '../../data/cases';
import { useBriefingTTS } from '../hooks/useBriefingTTS';
import { useSfx } from '../hooks/useSfx';
import TapePlayer from './TapePlayer';
import BriefingDialog from './BriefingDialog';

interface BriefingScreenProps {
  caseData: Case;
  difficulty: string;
  onStart: () => void;
  onBack: () => void;
}

export interface BriefingSection { label: string; text: string }

function buildBriefingSections(c: Case): BriefingSection[] {
  const sections: BriefingSection[] = [];
  if (c.briefing) sections.push({ label: 'Briefing', text: c.briefing });
  sections.push({ label: 'Crime', text: c.crime });
  sections.push({ label: 'Cover Story', text: c.suspect_cover_story });
  return sections;
}

const STICKY_BASE = [
  { label: 'Suspect', key: 'suspect_name' as const, bg: ['#FFB3B3', '#F5A0A0'] },
  { label: 'Role', key: 'suspect_role' as const, bg: ['#A3D5F5', '#8DC8EE'] },
  { label: 'Location', key: 'setting' as const, bg: ['#B3F5B3', '#9BE89B'] },
  { label: 'Mission', key: 'objective' as const, bg: ['#FFF5A3', '#F5E88D'] },
];

function randRange(min: number, max: number) { return min + Math.random() * (max - min); }
function randomizeStickies() {
  return STICKY_BASE.map(s => ({
    ...s,
    rot: randRange(-7, 7),
    y: randRange(-18, 22),
    ml: randRange(-14, 10),
  }));
}

export default function BriefingScreen({ caseData, difficulty, onStart, onBack }: BriefingScreenProps) {
  const [showBriefing, setShowBriefing] = useState(false);
  const [stickies] = useState(randomizeStickies);
  const sfx = useSfx();
  const sections = buildBriefingSections(caseData);
  const fullText = sections.map(s => s.text).join(' ');
  const diff = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.easy;
  const { charIndex, isPlaying, skip, stop } = useBriefingTTS(showBriefing, fullText, caseData);

  const closeBriefing = useCallback(() => { sfx('tape_start'); setShowBriefing(false); stop(); }, [stop, sfx]);

  return (
    <div className="min-h-screen text-foreground font-mono flex items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0" style={{ backgroundImage: 'url(/detective/desk.png)', backgroundSize: '60%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundColor: '#000', imageRendering: 'pixelated' }} />
      <div className="absolute inset-0 bg-black/50" />

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

      <button onClick={() => { sfx('click'); onBack(); }} className="absolute top-6 right-6 text-xs text-gray-500 hover:text-white uppercase tracking-wider transition-colors z-20">&larr; Cases</button>

      <motion.div className="max-w-2xl text-center relative z-10" initial="hidden" animate="visible" variants={stagger(0.1)}>
        <motion.div className="flex items-center justify-center gap-3 mb-3" variants={fadeUp} transition={smooth}>
          <p className="text-sm uppercase tracking-[0.3em] text-accent">Case #{caseData.case_number}</p>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm" style={{
            color: diff.color, border: `1px solid color-mix(in srgb, ${diff.color} 25%, transparent)`,
          }}>{difficulty.toUpperCase()}</span>
        </motion.div>
        <motion.h1 className="text-3xl font-bold mb-6" variants={fadeUp} transition={smooth}>BRIEFING</motion.h1>

        <motion.div className="flex justify-center mb-5" variants={fadeUp} transition={smooth}>
          <SuspectAvatar name={caseData.suspect_name} gender={caseData.suspect_gender} stressLevel={0} size="sm" />
        </motion.div>

        <motion.div className="flex justify-center gap-4 mb-6 flex-wrap" variants={fadeUp} transition={smooth}>
          {stickies.map((s) => {
            const val = caseData[s.key] || (s.key === 'objective' ? 'Find the lie' : '');
            const len = val.length;
            // Dynamic font: short text = big, long text = small
            const fontSize = len > 60 ? '11px' : len > 30 ? '13px' : len > 15 ? '16px' : '20px';
            return (
              <div key={s.label} className="relative p-4 pt-3 text-left w-36 h-36 flex flex-col overflow-hidden" style={{
                background: `linear-gradient(180deg, ${s.bg[0]} 0%, ${s.bg[1]} 100%)`,
                boxShadow: '2px 3px 10px rgba(0,0,0,0.35), inset 0 0 20px rgba(0,0,0,0.03)',
                transform: `rotate(${s.rot}deg) translateY(${s.y}px)`,
                marginLeft: `${s.ml}px`,
                filter: 'url(#paper-wrinkle)',
              }}>
                <div className="absolute inset-0 pointer-events-none" style={{
                  background: 'linear-gradient(125deg, transparent 30%, rgba(0,0,0,0.06) 30.5%, transparent 31%), linear-gradient(65deg, transparent 55%, rgba(255,255,255,0.1) 55.5%, transparent 56%)',
                }} />
                <p className="text-[9px] text-black/60 uppercase tracking-wider mb-2 relative z-10">{s.label}</p>
                <p className="text-black font-bold leading-snug relative z-10" style={{ fontFamily: 'var(--font-handwriting)', fontSize }}>{val}</p>
              </div>
            );
          })}
        </motion.div>

        <motion.button
          onClick={() => { sfx('click'); onStart(); }}
          className="mt-8 px-8 py-3 bg-accent text-white text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-accent-hover transition-colors"
          variants={fadeUp}
          transition={smooth}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          Begin Interrogation
        </motion.button>

        <motion.div className="mt-8" variants={fadeUp} transition={smooth}>
          <TapePlayer onClick={() => { sfx('tape_start'); setShowBriefing(true); }} />
        </motion.div>
      </motion.div>

      <BriefingDialog
        show={showBriefing}
        sections={sections}
        fullText={fullText}
        charIndex={charIndex}
        isPlaying={isPlaying}
        leads={caseData.detective_leads}
        onClose={closeBriefing}
        onSkip={skip}
        onStart={() => { skip(); onStart(); }}
      />
    </div>
  );
}
