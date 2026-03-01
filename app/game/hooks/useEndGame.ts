import { useCallback, type MutableRefObject } from 'react';
import type { Case } from '@/lib/game-state';
import type { ConversationMessage } from '@/lib/mistral';
import type { useSfx } from './useSfx';

interface EndGameDeps {
  caseData: Case | null;
  conversationHistory: ConversationMessage[];
  maxStress: number;
  cluesLength: number;
  timerRef: MutableRefObject<ReturnType<typeof setInterval> | null>;
  sfx: ReturnType<typeof useSfx>;
  speakResponse: (text: string, stress: number, name: string, onDone: () => void, enabled: boolean) => void;
  ttsEnabled: boolean;
  setPhase: (p: 'loading' | 'briefing' | 'active' | 'processing') => void;
  setLastResponse: (s: string) => void;
  setShowGiveUpConfirm: (b: boolean) => void;
  storePatterns: (outcome: string, history: ConversationMessage[], stress: number, clueCount: number) => void;
  router: { push: (url: string) => void };
}

export function useEndGame(deps: EndGameDeps) {
  const { caseData, conversationHistory, maxStress, cluesLength, timerRef, sfx, speakResponse, ttsEnabled, setPhase, setLastResponse, setShowGiveUpConfirm, storePatterns, router } = deps;

  const handleLose = useCallback((extra?: Record<string, unknown>) => {
    const outcome = extra?.timeUp ? 'lose_time' : extra?.gaveUp ? 'lose_giveup' : 'lose_accusations';
    storePatterns(outcome, conversationHistory, maxStress, cluesLength);
    sessionStorage.setItem('gameResult', JSON.stringify({ type: 'lose', caseData, sessionId: caseData?.sessionId, conversationHistory, maxStress, ...extra }));
    router.push('/game/lose');
  }, [caseData, conversationHistory, maxStress, cluesLength, storePatterns, router]);

  const handleTimeUp = useCallback(async () => {
    sfx('alarm');
    setPhase('processing');
    if (timerRef.current) clearInterval(timerRef.current);
    let timeUpRemark = '';
    if (caseData) {
      try {
        const res = await fetch('/api/interrogate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: caseData.sessionId, playerQuestion: '[Time is up. The interrogation is over and the suspect is free to go. Respond with one short, smug remark about the detective running out of time. Max 2 sentences.]' }) });
        const data = await res.json();
        if (data.spoken_response) {
          timeUpRemark = data.spoken_response;
          setLastResponse(timeUpRemark);
          await new Promise<void>((resolve) => { speakResponse(timeUpRemark, 1, caseData.suspect_name, resolve, ttsEnabled); });
        }
      } catch {}
    }
    sfx('standing_up');
    setTimeout(() => sfx('chair_slide'), 800);
    setTimeout(() => sfx('door'), 1800);
    setTimeout(() => sfx('gameover'), 2800);
    setTimeout(() => { handleLose({ timeUp: true, timeUpRemark }); }, 4500);
  }, [caseData, sfx, timerRef, speakResponse, ttsEnabled, setPhase, setLastResponse, handleLose]);

  const handleGiveUp = useCallback(async () => {
    setShowGiveUpConfirm(false);
    if (!caseData) return;
    sfx('chair_slide');
    setTimeout(() => sfx('sigh'), 500);
    setPhase('processing');
    if (timerRef.current) clearInterval(timerRef.current);
    let cleverRemark = '';
    try {
      const res = await fetch('/api/interrogate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: caseData.sessionId, playerQuestion: '[The detective has given up and is leaving. Respond with one short, smug remark as the suspect who got away with it. Max 2 sentences.]' }) });
      const data = await res.json();
      if (data.spoken_response) {
        cleverRemark = data.spoken_response;
        setLastResponse(cleverRemark);
        await new Promise<void>((resolve) => { speakResponse(cleverRemark, 1, caseData.suspect_name, resolve, ttsEnabled); });
      }
    } catch {}
    sessionStorage.setItem('gameResult', JSON.stringify({ type: 'lose', caseData, sessionId: caseData.sessionId, conversationHistory, maxStress, gaveUp: true, cleverRemark }));
    router.push('/game/lose');
  }, [caseData, conversationHistory, maxStress, sfx, timerRef, speakResponse, ttsEnabled, setPhase, setLastResponse, setShowGiveUpConfirm, router]);

  return { handleLose, handleTimeUp, handleGiveUp };
}
