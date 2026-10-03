import type { MutableRefObject } from 'react';
import type { SpeakResponseOptions } from './useTTS';
import type { PlaybackOutcome } from '../audio/speech-player';
import type { Case } from '@/lib/game-state';
import type { ConversationMessage } from '@/lib/mistral';
import type { useSfx } from './useSfx';

export interface EndGameDeps {
  caseData: Case | null;
  conversationHistory: ConversationMessage[];
  maxStress: number;
  cluesLength: number;
  timerRef: MutableRefObject<ReturnType<typeof setInterval> | null>;
  sfx: ReturnType<typeof useSfx>;
  speakResponse: (options: SpeakResponseOptions) => Promise<PlaybackOutcome>;
  ttsEnabled: boolean;
  setPhase: (p: 'loading' | 'briefing' | 'active' | 'processing') => void;
  setLastResponse: (s: string) => void;
  setLastTranscript: (s: string) => void;
  setShowGiveUpConfirm: (b: boolean) => void;
  setFadingOut: (b: boolean) => void;
  storePatterns: (outcome: string, history: ConversationMessage[], stress: number, clueCount: number) => void;
  router: { push: (url: string) => void };
}
