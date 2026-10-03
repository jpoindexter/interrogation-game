import { useState } from 'react';
import type { ActionFeedback } from '../components/ActionNotice';
export function useGamePanels() {
  const [showAccuseConfirm, setShowAccuseConfirm] = useState(false);
  const [accuseText, setAccuseText] = useState('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpPos, setHelpPos] = useState<{ x: number; y: number } | null>(null);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [questionDraft, setQuestionDraft] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [notesPos, setNotesPos] = useState<{ x: number; y: number } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsPos, setSettingsPos] = useState<{ x: number; y: number } | null>(null);
  const [showMicHint, setShowMicHint] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [toast, setToast] = useState<ActionFeedback | null>(null);
  return {
    showAccuseConfirm, setShowAccuseConfirm, accuseText, setAccuseText,
    showExitConfirm, setShowExitConfirm, showGiveUpConfirm, setShowGiveUpConfirm,
    showHelp, setShowHelp, helpPos, setHelpPos,
    notes, setNotes, showNotes, setShowNotes,
    questionDraft, setQuestionDraft, showTextInput, setShowTextInput, notesPos, setNotesPos,
    showSettings, setShowSettings, settingsPos, setSettingsPos,
    showMicHint, setShowMicHint, showOnboarding, setShowOnboarding,
    fadingOut, setFadingOut, toast, setToast
  };
}
