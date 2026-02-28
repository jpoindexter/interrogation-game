import type { Case } from '@/lib/game-state';

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
  onHelpToggle: () => void;
  onExitClick: () => void;
}

export default function Dock({
  isListening,
  isSpeaking,
  isAccusing,
  phase,
  showTextInput,
  showNotes,
  showSettings,
  clues,
  cluesNeeded,
  accusationsLeft,
  hintsUsed,
  caseData,
  showAccuseConfirm,
  onMicToggle,
  onTypeToggle,
  onNotesToggle,
  onHintClick,
  onAccuseClick,
  onSettingsToggle,
  onHelpToggle,
  onExitClick,
}: DockProps) {
  const hintsMax = Math.min(cluesNeeded, caseData?.stress_triggers?.length ?? 0);
  const hintsExhausted = !caseData || hintsUsed >= hintsMax;
  const accuseDisabled =
    (!isAccusing && (phase === 'processing' || isSpeaking || accusationsLeft <= 0 || clues.length < cluesNeeded || showAccuseConfirm))
    || (isAccusing && !isListening);

  return (
    <div className="flex-shrink-0 flex justify-center p-3 border-t border-[#2A2A2A]">
      <div className="flex items-end gap-1 px-3 py-2 bg-[#1A1A1A]/80 backdrop-blur-sm border border-[#2A2A2A] rounded-2xl">
        {/* Speak */}
        <button
          onClick={onMicToggle}
          disabled={phase === 'processing' || isSpeaking || isAccusing}
          data-tooltip="Speak"
          className={`dock-icon ${
            isListening
              ? 'bg-[#C41E1E] text-white shadow-[0_0_20px_rgba(196,30,30,0.5)]'
              : 'bg-[#2A2A2A] text-[#E8E8E8]'
          } ${phase === 'processing' || isSpeaking || isAccusing ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          {isListening ? (
            <div className="w-4 h-4 bg-white rounded-sm" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>

        {/* Type */}
        <button
          onClick={onTypeToggle}
          data-tooltip="Type"
          className={`dock-icon ${
            showTextInput ? 'bg-[#2A2A2A] text-[#E8E8E8] ring-1 ring-[#C8A050]' : 'bg-[#2A2A2A] text-gray-500'
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <line x1="6" y1="8" x2="6" y2="8" /><line x1="10" y1="8" x2="10" y2="8" />
            <line x1="14" y1="8" x2="14" y2="8" /><line x1="18" y1="8" x2="18" y2="8" />
            <line x1="6" y1="12" x2="6" y2="12" /><line x1="10" y1="12" x2="10" y2="12" />
            <line x1="14" y1="12" x2="14" y2="12" /><line x1="18" y1="12" x2="18" y2="12" />
            <line x1="8" y1="16" x2="16" y2="16" />
          </svg>
        </button>

        {/* Notes */}
        <button
          onClick={onNotesToggle}
          data-tooltip="Notes"
          className={`dock-icon ${
            showNotes ? 'bg-[#2A2A2A] text-[#E8E8E8] ring-1 ring-[#C8A050]' : 'bg-[#2A2A2A] text-gray-500'
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>

        <div className="w-px h-8 bg-[#2A2A2A] mx-1" />

        {/* Hint */}
        <button
          onClick={onHintClick}
          disabled={hintsExhausted}
          data-tooltip={`Hint (${hintsUsed}/${cluesNeeded})`}
          className={`dock-icon ${
            hintsExhausted ? 'bg-[#1A1A1A] text-gray-700 cursor-not-allowed' : 'bg-[#2A2A2A] text-[#F59E0B]'
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>

        {/* Accuse */}
        <button
          onClick={onAccuseClick}
          disabled={accuseDisabled}
          data-tooltip={
            isAccusing && isListening ? 'Stop'
              : clues.length < cluesNeeded ? `Find ${cluesNeeded - clues.length} more clue${cluesNeeded - clues.length === 1 ? '' : 's'}`
              : `Accuse (${accusationsLeft})`
          }
          className={`dock-icon ${
            (accusationsLeft <= 0 || clues.length < cluesNeeded) && !isAccusing
              ? 'bg-[#1A1A1A] text-gray-700 cursor-not-allowed'
              : isAccusing
                ? 'bg-[#C41E1E] text-white shadow-[0_0_20px_rgba(196,30,30,0.5)]'
                : 'bg-[#2A2A2A] text-[#C41E1E]'
          }`}
        >
          {isAccusing && isListening ? (
            <div className="w-4 h-4 bg-white rounded-sm" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          )}
        </button>

        <div className="w-px h-8 bg-[#2A2A2A] mx-1" />

        {/* Settings */}
        <button
          onClick={onSettingsToggle}
          data-tooltip="Settings"
          className={`dock-icon ${
            showSettings ? 'bg-[#2A2A2A] text-[#E8E8E8] ring-1 ring-[#C8A050]' : 'bg-[#2A2A2A] text-gray-500'
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        {/* Help */}
        <button
          onClick={onHelpToggle}
          data-tooltip="How to Play"
          className="dock-icon bg-[#2A2A2A] text-gray-500"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>

        {/* Exit */}
        <button
          onClick={onExitClick}
          data-tooltip="Exit"
          className="dock-icon bg-[#2A2A2A] text-gray-500"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
