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

  const navigateLose = useCallback((extra?: Record<string, unknown>) => {
    const outcome = extra?.lawyeredUp ? 'lose_lawyer' : extra?.timeUp ? 'lose_time' : extra?.gaveUp ? 'lose_giveup' : 'lose_accusations';
    storePatterns(outcome, conversationHistory, maxStress, cluesLength);
    sessionStorage.setItem('gameResult', JSON.stringify({ type: 'lose', caseData, sessionId: caseData?.sessionId, conversationHistory, maxStress, ...extra }));
    setFadingOut(true);
    setTimeout(() => router.push('/game/lose'), 800);
  }, [caseData, conversationHistory, maxStress, cluesLength, storePatterns, setFadingOut, router]);

  const handleLose = useCallback(async (extra?: Record<string, unknown>) => {
    // Out of accusations — full ceremony: sound → AI remark → exit sounds → fade → navigate
    if (!extra) {
      sfx('wrong');
      setPhase('processing');
      if (timerRef.current) clearInterval(timerRef.current);
      setLastTranscript('(Out of accusations)');
      setLastResponse('');
      let remark = '';
      if (caseData) {
        try {
          const res = await fetch('/api/interrogate', { method: 'POST', headers: { 'Content-Type': 'application/json', ...getUserApiHeaders() }, body: JSON.stringify({ sessionId: caseData.sessionId, playerQuestion: '[The detective has used all 3 accusations and failed. The suspect is free to go. Respond with one short, smug remark about the detective\'s failed attempts. Max 2 sentences.]' }) });
          const data = await res.json();
          if (data.spoken_response) {
            remark = data.spoken_response;
            setLastTranscript('');
            setLastResponse(remark);
            await new Promise<void>((resolve) => { speakResponse(remark, 1, caseData.suspect_name, resolve, ttsEnabled); });
          }
        } catch {}
      }
      sfx('standing_up');
      setTimeout(() => sfx('chair_slide'), 800);
      setTimeout(() => sfx('door'), 1800);
      setTimeout(() => sfx('gameover'), 2800);
      setTimeout(() => navigateLose({ cleverRemark: remark }), 4500);
      return;
    }
    navigateLose(extra);
  }, [caseData, sfx, timerRef, speakResponse, ttsEnabled, setPhase, setLastResponse, setLastTranscript, navigateLose]);

  const handleTimeUp = useCallback(async () => {
    sfx('alarm');
    setPhase('processing');
    if (timerRef.current) clearInterval(timerRef.current);
    setLastTranscript('(Time\u2019s up)');
    setLastResponse('');
    let timeUpRemark = '';
    if (caseData) {
      try {
        const res = await fetch('/api/interrogate', { method: 'POST', headers: { 'Content-Type': 'application/json', ...getUserApiHeaders() }, body: JSON.stringify({ sessionId: caseData.sessionId, playerQuestion: '[Time is up. The interrogation is over and the suspect is free to go. Respond with one short, smug remark about the detective running out of time. Max 2 sentences.]' }) });
        const data = await res.json();
        if (data.spoken_response) {
          timeUpRemark = data.spoken_response;
          setLastTranscript('');
          setLastResponse(timeUpRemark);
          await new Promise<void>((resolve) => { speakResponse(timeUpRemark, 1, caseData.suspect_name, resolve, ttsEnabled); });
        }
      } catch {}
    }
    sfx('standing_up');
    setTimeout(() => sfx('chair_slide'), 800);
    setTimeout(() => sfx('door'), 1800);
    setTimeout(() => sfx('gameover'), 2800);
    setTimeout(() => { navigateLose({ timeUp: true, timeUpRemark }); }, 4500);
  }, [caseData, sfx, timerRef, speakResponse, ttsEnabled, setPhase, setLastResponse, setLastTranscript, navigateLose]);

  const handleGiveUp = useCallback(async () => {
    setShowGiveUpConfirm(false);
    if (!caseData) return;
    sfx('sigh');
    setPhase('processing');
    if (timerRef.current) clearInterval(timerRef.current);
    setLastTranscript('(Gave up)');
    setLastResponse('');
    let cleverRemark = '';
    try {
      const res = await fetch('/api/interrogate', { method: 'POST', headers: { 'Content-Type': 'application/json', ...getUserApiHeaders() }, body: JSON.stringify({ sessionId: caseData.sessionId, playerQuestion: '[The detective has given up and is leaving. Respond with one short, smug remark as the suspect who got away with it. Max 2 sentences.]' }) });
      const data = await res.json();
      if (data.spoken_response) {
        cleverRemark = data.spoken_response;
        setLastTranscript('');
        setLastResponse(cleverRemark);
        await new Promise<void>((resolve) => { speakResponse(cleverRemark, 1, caseData.suspect_name, resolve, ttsEnabled); });
      }
    } catch {}
    sfx('standing_up');
    setTimeout(() => sfx('chair_slide'), 800);
    setTimeout(() => sfx('door'), 1800);
    setTimeout(() => sfx('gameover'), 2800);
    setTimeout(() => navigateLose({ gaveUp: true, cleverRemark }), 4500);
  }, [caseData, sfx, timerRef, speakResponse, ttsEnabled, setPhase, setLastResponse, setLastTranscript, setShowGiveUpConfirm, navigateLose]);

  /** Suspect lawyers up — game over. Spoken response already in data. */
  const handleLawyerUp = useCallback(async (lawyerResponse: string) => {
    if (!caseData) return;
    setPhase('processing');
    if (timerRef.current) clearInterval(timerRef.current);
    setLastTranscript('');
    setLastResponse(lawyerResponse);
    await new Promise<void>((resolve) => { speakResponse(lawyerResponse, 9, caseData.suspect_name, resolve, ttsEnabled); });
    sfx('standing_up');
    setTimeout(() => sfx('chair_slide'), 800);
    setTimeout(() => sfx('door'), 1800);
    setTimeout(() => sfx('gameover'), 2800);
    setTimeout(() => navigateLose({ lawyeredUp: true, cleverRemark: lawyerResponse }), 4500);
  }, [caseData, sfx, timerRef, speakResponse, ttsEnabled, setPhase, setLastResponse, setLastTranscript, navigateLose]);

  return { handleLose, handleTimeUp, handleGiveUp, handleLawyerUp };
}
