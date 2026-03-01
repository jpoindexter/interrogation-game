import { useCallback, type MutableRefObject } from 'react';
import type { Case } from '@/lib/game-state';
import type { ConversationMessage } from '@/lib/mistral';
import type { useSfx } from './useSfx';
import { getUserApiHeaders } from '../../lib/api-keys';

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
  setLastTranscript: (s: string) => void;
  setShowGiveUpConfirm: (b: boolean) => void;
  setFadingOut: (b: boolean) => void;
  storePatterns: (outcome: string, history: ConversationMessage[], stress: number, clueCount: number) => void;
  router: { push: (url: string) => void };
}

export function useEndGame(deps: EndGameDeps) {
  const { caseData, conversationHistory, maxStress, cluesLength, timerRef, sfx, speakResponse, ttsEnabled, setPhase, setLastResponse, setLastTranscript, setShowGiveUpConfirm, setFadingOut, storePatterns, router } = deps;

  const exitCeremony = useCallback((extra: Record<string, unknown>) => {
    sfx('standing_up');
    setTimeout(() => sfx('chair_slide'), 800);
    setTimeout(() => sfx('door'), 1800);
    setTimeout(() => sfx('gameover'), 2800);
    const outcome = extra.lawyeredUp ? 'lose_lawyer' : extra.timeUp ? 'lose_time' : extra.gaveUp ? 'lose_giveup' : 'lose_accusations';
    storePatterns(outcome, conversationHistory, maxStress, cluesLength);
    sessionStorage.setItem('gameResult', JSON.stringify({ type: 'lose', caseData, sessionId: caseData?.sessionId, conversationHistory, maxStress, ...extra }));
    setTimeout(() => { setFadingOut(true); setTimeout(() => router.push('/game/lose'), 800); }, 4500);
  }, [caseData, conversationHistory, maxStress, cluesLength, storePatterns, setFadingOut, router, sfx]);

  /** Fetch a final remark from the AI, speak it via TTS, then play exit ceremony */
  const remarkAndExit = useCallback(async (prompt: string, transcript: string, openingSfx: string, extra: Record<string, unknown>, remarkKey = 'cleverRemark') => {
    sfx(openingSfx as Parameters<typeof sfx>[0]);
    setPhase('processing');
    if (timerRef.current) clearInterval(timerRef.current);
    setLastTranscript(transcript);
    setLastResponse('');
    let remark = '';
    if (caseData) {
      try {
        const res = await fetch('/api/interrogate', { method: 'POST', headers: { 'Content-Type': 'application/json', ...getUserApiHeaders() }, body: JSON.stringify({ sessionId: caseData.sessionId, playerQuestion: prompt }) });
        const data = await res.json();
        if (data.spoken_response) {
          remark = data.spoken_response;
          setLastTranscript('');
          setLastResponse(remark);
          await new Promise<void>((resolve) => { speakResponse(remark, 1, caseData.suspect_name, resolve, ttsEnabled); });
        }
      } catch {}
    }
    exitCeremony({ ...extra, [remarkKey]: remark });
  }, [caseData, sfx, timerRef, speakResponse, ttsEnabled, setPhase, setLastResponse, setLastTranscript, exitCeremony]);

  const handleLose = useCallback(async (extra?: Record<string, unknown>) => {
    if (!extra) {
      await remarkAndExit('[The detective has used all 3 accusations and failed. The suspect is free to go. Respond with one short, smug remark about the detective\'s failed attempts. Max 2 sentences.]', '(Out of accusations)', 'wrong', {});
      return;
    }
    exitCeremony(extra);
  }, [remarkAndExit, exitCeremony]);

  const handleTimeUp = useCallback(() =>
    remarkAndExit('[Time is up. The interrogation is over and the suspect is free to go. Respond with one short, smug remark about the detective running out of time. Max 2 sentences.]', '(Time\u2019s up)', 'alarm', { timeUp: true }, 'timeUpRemark'),
  [remarkAndExit]);

  const handleGiveUp = useCallback(async () => {
    setShowGiveUpConfirm(false);
    if (!caseData) return;
    await remarkAndExit('[The detective has given up and is leaving. Respond with one short, smug remark as the suspect who got away with it. Max 2 sentences.]', '(Gave up)', 'sigh', { gaveUp: true });
  }, [caseData, remarkAndExit, setShowGiveUpConfirm]);

  /** Suspect lawyers up -- spoken response already provided */
  const handleLawyerUp = useCallback(async (lawyerResponse: string) => {
    if (!caseData) return;
    setPhase('processing');
    if (timerRef.current) clearInterval(timerRef.current);
    setLastTranscript('');
    setLastResponse(lawyerResponse);
    await new Promise<void>((resolve) => { speakResponse(lawyerResponse, 9, caseData.suspect_name, resolve, ttsEnabled); });
    exitCeremony({ lawyeredUp: true, cleverRemark: lawyerResponse });
  }, [caseData, sfx, timerRef, speakResponse, ttsEnabled, setPhase, setLastResponse, setLastTranscript, exitCeremony]);

  return { handleLose, handleTimeUp, handleGiveUp, handleLawyerUp };
}
