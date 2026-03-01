import type { Case } from '@/lib/game-state';
import SuspectAvatar from '../SuspectAvatar';
import { getSceneBg } from './utils';
import { motion, fadeUp, stagger, smooth, snappy } from '../../components/motion';

interface BriefingScreenProps {
  caseData: Case;
  difficulty: string;
  onStart: () => void;
  onBack: () => void;
}

export default function BriefingScreen({ caseData, difficulty, onStart, onBack }: BriefingScreenProps) {
  return (
    <div
      className="min-h-screen text-foreground font-mono flex items-center justify-center p-8 relative overflow-hidden"
    >
      {/* Desk background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/detective/desk.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-black/50" />
      {/* SVG filter for paper wrinkle texture */}
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
      <button
        onClick={onBack}
        className="absolute top-6 right-6 text-xs text-gray-500 hover:text-white uppercase tracking-wider transition-colors z-20"
      >
        &larr; Cases
      </button>
      <motion.div
        className="max-w-2xl text-center relative z-10"
        initial="hidden"
        animate="visible"
        variants={stagger(0.1)}
      >
        <motion.div className="flex items-center justify-center gap-3 mb-4" variants={fadeUp} transition={smooth}>
          <p className="text-sm uppercase tracking-[0.3em] text-accent">
            Case #{caseData.case_number}
          </p>
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm"
            style={{
              color: difficulty === 'easy' ? 'var(--diff-easy)' : difficulty === 'medium' ? 'var(--diff-medium)' : difficulty === 'hard' ? 'var(--diff-hard)' : 'var(--diff-expert)',
              border: `1px solid color-mix(in srgb, ${difficulty === 'easy' ? 'var(--diff-easy)' : difficulty === 'medium' ? 'var(--diff-medium)' : difficulty === 'hard' ? 'var(--diff-hard)' : 'var(--diff-expert)'} 25%, transparent)`,
            }}
          >
            {difficulty.toUpperCase()}
          </span>
        </motion.div>
        <motion.h1 className="text-4xl font-bold mb-8" variants={fadeUp} transition={smooth}>BRIEFING</motion.h1>
        <motion.div className="flex justify-center mb-6" variants={fadeUp} transition={smooth}>
          <SuspectAvatar name={caseData.suspect_name} gender={caseData.suspect_gender} stressLevel={0} size="sm" />
        </motion.div>
        {/* Briefing text */}
        <motion.p
          className="text-sm text-gray-300 leading-relaxed max-w-md mx-auto mb-5"
          variants={fadeUp}
          transition={smooth}
        >
          {caseData.briefing}
        </motion.p>

        {/* 3 small info stickies */}
        <motion.div className="flex justify-center gap-8 mb-8 mt-2" variants={fadeUp} transition={smooth}>
          {/* Suspect */}
          <div
            className="relative p-2.5 text-center w-48 h-48 flex flex-col justify-center"
            style={{
              background: 'linear-gradient(180deg, #FFB3B3 0%, #F5A0A0 100%)',
              boxShadow: '2px 3px 10px rgba(0,0,0,0.35), inset 0 0 20px rgba(0,0,0,0.03)',
              transform: 'rotate(-3deg)',
              filter: 'url(#paper-wrinkle)',
            }}
          >
            {/* Crease lines */}
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'linear-gradient(125deg, transparent 30%, rgba(0,0,0,0.06) 30.5%, transparent 31%), linear-gradient(65deg, transparent 55%, rgba(255,255,255,0.1) 55.5%, transparent 56%), linear-gradient(170deg, transparent 70%, rgba(0,0,0,0.04) 70.5%, transparent 71%)',
            }} />
            <p className="text-[10px] text-red-900/60 uppercase tracking-wider mb-1 relative z-10">Suspect</p>
            <p className="text-2xl text-red-950 font-bold leading-tight relative z-10" style={{ fontFamily: 'var(--font-handwriting)' }}>{caseData.suspect_name}</p>
          </div>
          {/* Role */}
          <div
            className="relative p-2.5 text-center w-48 h-48 flex flex-col justify-center"
            style={{
              background: 'linear-gradient(180deg, #A3D5F5 0%, #8DC8EE 100%)',
              boxShadow: '2px 3px 10px rgba(0,0,0,0.35), inset 0 0 20px rgba(0,0,0,0.03)',
              transform: 'rotate(2deg)',
              filter: 'url(#paper-wrinkle)',
            }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'linear-gradient(140deg, transparent 40%, rgba(0,0,0,0.06) 40.5%, transparent 41%), linear-gradient(50deg, transparent 25%, rgba(255,255,255,0.1) 25.5%, transparent 26%), linear-gradient(160deg, transparent 60%, rgba(0,0,0,0.04) 60.5%, transparent 61%)',
            }} />
            <p className="text-[10px] text-blue-900/60 uppercase tracking-wider mb-1 relative z-10">Role</p>
            <p className="text-2xl text-blue-950 font-bold leading-tight relative z-10" style={{ fontFamily: 'var(--font-handwriting)' }}>{caseData.suspect_role}</p>
          </div>
          {/* Location */}
          <div
            className="relative p-2.5 text-center w-48 h-48 flex flex-col justify-center"
            style={{
              background: 'linear-gradient(180deg, #B3F5B3 0%, #9BE89B 100%)',
              boxShadow: '2px 3px 10px rgba(0,0,0,0.35), inset 0 0 20px rgba(0,0,0,0.03)',
              transform: 'rotate(-1.5deg)',
              filter: 'url(#paper-wrinkle)',
            }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'linear-gradient(110deg, transparent 45%, rgba(0,0,0,0.06) 45.5%, transparent 46%), linear-gradient(75deg, transparent 35%, rgba(255,255,255,0.1) 35.5%, transparent 36%), linear-gradient(155deg, transparent 65%, rgba(0,0,0,0.04) 65.5%, transparent 66%)',
            }} />
            <p className="text-[10px] text-green-900/60 uppercase tracking-wider mb-1 relative z-10">Location</p>
            <p className="text-2xl text-green-950 font-bold leading-tight relative z-10" style={{ fontFamily: 'var(--font-handwriting)' }}>{caseData.setting}</p>
          </div>
        </motion.div>
        <motion.button
          onClick={onStart}
          className="px-6 py-2.5 bg-accent text-white text-sm font-bold rounded hover:bg-red-700 transition-colors uppercase tracking-wider"
          variants={fadeUp}
          transition={snappy}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
        >
          BEGIN INTERROGATION
        </motion.button>
      </motion.div>
    </div>
  );
}
