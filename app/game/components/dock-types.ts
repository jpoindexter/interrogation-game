import type { ReactNode } from 'react';
export interface DockActions {
  mic: () => void;
  type: () => void;
  notes: () => void;
  hint: () => void;
  accuse: () => void;
  settings: () => void;
  giveUp: () => void;
  help: () => void;
  exit: () => void;
}
export interface DockProps {
  input: { listening: boolean; speaking: boolean; accusing: boolean; phase: string };
  panels: { text: boolean; notes: boolean; settings: boolean; accuseConfirm: boolean };
  progress: { hasCase: boolean; clues: number; required: number; accusationsLeft: number; hintsUsed: number };
  actions: DockActions;
}
export interface DockAction {
  id: keyof DockActions;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  selected?: boolean;
  className?: string;
}
