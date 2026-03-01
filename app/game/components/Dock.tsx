import type { Case } from '@/lib/game-state';
import { MicIcon, KeyboardIcon, PenIcon, HintIcon, AccuseIcon, GearIcon, FlagIcon, ExitIcon } from './icons';
import { motion, fadeUp, stagger, snappy } from '../../components/motion';

interface DockProps {
  isListening: boolean;
  isSpeaking: boolean;
  isAccusing: boolean;
  phase: string;
  showTextInput: boolean;
  showNotes: boolean;
  showSettings: boolean;
  clues: string[];
  cluesNeeded: number;
  accusationsLeft: number;
  hintsUsed: number;
  caseData: Case | null;
  showAccuseConfirm: boolean;
  onMicToggle: () => void;
  onTypeToggle: () => void;
  onNotesToggle: () => void;
  onHintClick: () => void;
  onAccuseClick: () => void;
  onSettingsToggle: () => void;
  onGiveUpClick: () => void;
  onHelpToggle: () => void;
  onExitClick: () => void;
}

const active = (on: boolean) => on ? 'bg-surface text-foreground ring-1 ring-gold' : 'bg-surface text-gray-500';

export default function Dock({
  isListening, isSpeaking, isAccusing, phase,
  showTextInput, showNotes, showSettings,
  clues, cluesNeeded, accusationsLeft, hintsUsed, caseData,
  showAccuseConfirm,
  onMicToggle, onTypeToggle, onNotesToggle, onHintClick,
  onAccuseClick, onSettingsToggle, onGiveUpClick, onHelpToggle, onExitClick,
}: DockProps) {
  const busy = phase === 'processing' || isSpeaking;
  // Server enforces actual limit; client uses cluesNeeded as the visible cap
  const hintsExhausted = !caseData || hintsUsed >= cluesNeeded;
  const accuseDisabled =
    (!isAccusing && (busy || accusationsLeft <= 0 || showAccuseConfirm))
    || (isAccusing && !isListening);

  return (
    <motion.div
      className="flex-shrink-0 flex justify-center p-3 border-t border-surface-darker"
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      transition={snappy}
    >
      <motion.div
        className="flex items-end gap-1 px-3 py-2 bg-surface-dark/80 backdrop-blur-sm border border-surface-darker rounded-2xl"
        variants={stagger(0.04)}
        initial="hidden"
        animate="visible"
      >
        {/* Speak */}
        <motion.button
          variants={fadeUp}
          whileHover={{ scale: 1.05 }}
          transition={snappy}
          onClick={onMicToggle}
          disabled={busy || isAccusing}
          data-tooltip="Speak"
          className={`dock-icon ${
            isListening
              ? 'bg-accent text-white shadow-[0_0_20px_rgba(196,30,30,0.5)]'
              : 'bg-surface text-foreground'
          } ${busy || isAccusing ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          {isListening ? <div className="w-4 h-4 bg-white rounded-sm" /> : <MicIcon />}
        </motion.button>

        <motion.button variants={fadeUp} whileHover={{ scale: 1.05 }} transition={snappy} onClick={onTypeToggle} data-tooltip="Type" className={`dock-icon ${active(showTextInput)}`}>
          <KeyboardIcon />
        </motion.button>

        <motion.button variants={fadeUp} whileHover={{ scale: 1.05 }} transition={snappy} onClick={onNotesToggle} data-tooltip="Notes" className={`dock-icon ${active(showNotes)}`}>
          <PenIcon />
        </motion.button>

        <motion.div variants={fadeUp} className="w-px h-8 bg-surface mx-1" />

        <motion.button
          variants={fadeUp}
          whileHover={{ scale: 1.05 }}
          transition={snappy}
          onClick={onHintClick}
          disabled={hintsExhausted}
          data-tooltip={`Hint (${hintsUsed}/${cluesNeeded})`}
          className={`dock-icon ${hintsExhausted ? 'bg-surface-dark text-gray-700 cursor-not-allowed' : 'bg-surface text-warn'}`}
        >
          <HintIcon />
        </motion.button>

        <motion.button
          variants={fadeUp}
          whileHover={{ scale: 1.05 }}
          transition={snappy}
          onClick={onAccuseClick}
          disabled={accuseDisabled}
          data-tooltip={
            isAccusing && isListening ? 'Stop'
              : accusationsLeft <= 0 ? 'No attempts left'
              : `Accuse (${accusationsLeft})`
          }
          className={`dock-icon ${
            accusationsLeft <= 0 && !isAccusing
              ? 'bg-surface-dark text-gray-700 cursor-not-allowed'
              : isAccusing
                ? 'bg-accent text-white shadow-[0_0_20px_rgba(196,30,30,0.5)]'
                : 'bg-surface text-accent'
          }`}
        >
          {isAccusing && isListening ? <div className="w-4 h-4 bg-white rounded-sm" /> : <AccuseIcon />}
        </motion.button>

        <motion.div variants={fadeUp} className="w-px h-8 bg-surface mx-1" />

        <motion.button variants={fadeUp} whileHover={{ scale: 1.05 }} transition={snappy} onClick={onSettingsToggle} data-tooltip="Settings" className={`dock-icon ${active(showSettings)}`}>
          <GearIcon />
        </motion.button>

        <motion.button variants={fadeUp} whileHover={{ scale: 1.05 }} transition={snappy} onClick={onHelpToggle} data-tooltip="How to Play" className="dock-icon bg-surface text-gray-500">
          <HintIcon />
        </motion.button>

        <motion.button variants={fadeUp} whileHover={{ scale: 1.05 }} transition={snappy} onClick={onGiveUpClick} disabled={busy} data-tooltip="Give Up" className={`dock-icon bg-surface text-gray-500 ${busy ? 'opacity-40 cursor-not-allowed' : ''}`}>
          <FlagIcon />
        </motion.button>

        <motion.button variants={fadeUp} whileHover={{ scale: 1.05 }} transition={snappy} onClick={onExitClick} data-tooltip="Exit" className="dock-icon bg-surface text-gray-500">
          <ExitIcon />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
