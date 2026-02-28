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
      style={{
        backgroundImage: `url(${getSceneBg(caseData.setting)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        imageRendering: 'pixelated',
      }}
    >
      <div className="absolute inset-0 bg-black/70" />
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
        <motion.div className="bg-surface p-8 rounded-lg mb-6 text-left" variants={fadeUp} transition={smooth}>
          <p className="text-lg leading-relaxed mb-4">{caseData.briefing}</p>
          <div className="border-t border-gray-600 pt-4 mt-4">
            <p className="text-sm text-gray-400">
              Suspect: <span className="text-foreground">{caseData.suspect_name}</span>
            </p>
            <p className="text-sm text-gray-400">
              Role: <span className="text-foreground">{caseData.suspect_role}</span>
            </p>
            <p className="text-sm text-gray-400">
              Location: <span className="text-foreground">{caseData.setting}</span>
            </p>
          </div>
        </motion.div>
        <motion.button
          onClick={onStart}
          className="px-8 py-4 bg-accent text-white text-xl font-bold rounded-lg hover:bg-red-700 transition-colors"
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
