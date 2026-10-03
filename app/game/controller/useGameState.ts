import { useState } from 'react';
import type { Case } from '@/lib/game-state';
import type { ConversationMessage } from '@/lib/game-ai';
import { pickRandomIcons } from '../components/utils';
export function useGameState() {
  const [gameplay, setGameplay] = useState<import('../playbook/types').PublicGameplayProjection | null>(null);
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [phase, setPhase] = useState<'loading' | 'briefing' | 'active' | 'processing'>('loading');
  const [stressLevel, setStressLevel] = useState(0);
  const [maxStress, setMaxStress] = useState(0);
  const [clues, setClues] = useState<string[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [lastResponse, setLastResponse] = useState('');
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintTexts, setHintTexts] = useState<string[]>([]);
  const [accusationsLeft, setAccusationsLeft] = useState(3);
  const [isAccusing, setIsAccusing] = useState(false);
  const [clueNotification, setClueNotification] = useState<number | null>(null);
  const [clueIcons] = useState<string[]>(() => pickRandomIcons(5));
  const [lastTranscript, setLastTranscript] = useState('');
  return {
    gameplay, setGameplay, caseData, setCaseData, phase, setPhase,
    stressLevel, setStressLevel, maxStress, setMaxStress,
    clues, setClues, conversationHistory, setConversationHistory,
    lastResponse, setLastResponse, hintsUsed, setHintsUsed,
    hintTexts, setHintTexts, accusationsLeft, setAccusationsLeft,
    isAccusing, setIsAccusing, clueNotification, setClueNotification,
    clueIcons, lastTranscript, setLastTranscript
  };
}
