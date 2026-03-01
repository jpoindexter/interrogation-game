'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Case } from '@/lib/game-state';
import type { ConversationMessage } from '@/lib/mistral';
import { DIFFICULTY_CLUES, pickRandomIcons, fetchWithTimeout } from './components/utils';
import TopBar from './components/TopBar';
import SuspectZone from './components/SuspectZone';
import CaseFile from './components/CaseFile';
import Dock from './components/Dock';
import ClueNotification from './components/ClueNotification';
import TextInputPanel from './components/TextInputPanel';
import NotesPanel from './components/NotesPanel';
import ExitConfirmDialog from './components/ExitConfirmDialog';
import GiveUpConfirmDialog from './components/GiveUpConfirmDialog';
import AccuseConfirmDialog from './components/AccuseConfirmDialog';
import SettingsPanel from './components/SettingsPanel';
import HelpPanel from './components/HelpPanel';
import OnboardingOverlay from './components/OnboardingOverlay';
import MicPermissionBanner from './components/MicPermissionBanner';
import LoadingScreen from './components/LoadingScreen';
import BriefingScreen from './components/BriefingScreen';
import { useVoiceRecorder } from './hooks/useVoiceRecorder';
import { useTTS } from './hooks/useTTS';
import { useGameTimer } from './hooks/useGameTimer';
import { useSettings } from './hooks/useSettings';
import { useSfx } from './hooks/useSfx';
import { usePatterns } from './hooks/usePatterns';
import { useEndGame } from './hooks/useEndGame';
import { Spinner } from '../components/ui';
import { motion, AnimatePresence, fadeIn, smooth } from '../components/motion';
import { getUserApiHeaders } from '../lib/api-keys';

const NERVOUS_NEUTRAL = ['nervous_1', 'nervous_knock', 'nervous_tap', 'nervous_scratch', 'nervous_ac', 'clothes_rustle'] as const;
const NERVOUS_MALE = ['nervous_foot', 'nervous_cough_m'] as const;
const NERVOUS_FEMALE = ['nervous_heel', 'nervous_cough_f', 'female_sigh'] as const;
function getNervousSounds(gender?: string) { return [...NERVOUS_NEUTRAL, ...(gender?.toLowerCase() === 'female' ? NERVOUS_FEMALE : NERVOUS_MALE)]; }

export default function GamePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-foreground font-mono flex items-center justify-center"><div className="text-center"><h1 className="text-2xl font-bold mb-4">GENERATING CASE...</h1><Spinner /></div></div>}>
      <GameContent />
    </Suspense>
  );
}

function GameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings, updateSettings } = useSettings();

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
  const [showAccuseConfirm, setShowAccuseConfirm] = useState(false);
  const [accuseText, setAccuseText] = useState('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpPos, setHelpPos] = useState<{ x: number; y: number } | null>(null);
  const [clueNotification, setClueNotification] = useState<number | null>(null);
  const difficulty = searchParams.get('difficulty') || 'medium';
  const cluesNeeded = DIFFICULTY_CLUES[difficulty] || 3;
  const [clueIcons] = useState<string[]>(() => pickRandomIcons(cluesNeeded));
  const [lastTranscript, setLastTranscript] = useState('');
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [notesPos, setNotesPos] = useState<{ x: number; y: number } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsPos, setSettingsPos] = useState<{ x: number; y: number } | null>(null);
  const [showMicHint, setShowMicHint] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const sfx = useSfx();
  const showToast = useCallback((msg: string) => { sfx('error'); setToast(msg); setTimeout(() => setToast(null), 4000); }, [sfx]);
  const { isListening, setIsListening, startRecording, stopListening } = useVoiceRecorder(caseData?.sessionId);
  const ttsErrorToast = useCallback(() => showToast('Voice server unavailable — reading text instead'), [showToast]);
  const { isSpeaking, audioRef, speakResponse, speakConfession, skipSpeech } = useTTS(caseData?.suspect_gender, caseData?.sessionId, ttsErrorToast);
  const { remaining, elapsed, timeLimit, timerRef, onExpire, isUnlimited } = useGameTimer(phase, isSpeaking, difficulty);
  const storePatterns = usePatterns(caseData?.sessionId, caseData?.setting, difficulty, elapsed);
  const { handleLose, handleTimeUp, handleGiveUp, handleLawyerUp } = useEndGame({
    caseData, conversationHistory, maxStress, cluesLength: clues.length,
    timerRef, sfx, speakResponse, ttsEnabled: settings.ttsEnabled,
    setPhase, setLastResponse, setLastTranscript, setShowGiveUpConfirm, setFadingOut,
    storePatterns, router,
  });
  const dialogueEndRef = useRef<HTMLDivElement | null>(null);
  const prevVolumeRef = useRef(settings.musicVolume > 0 ? settings.musicVolume : 0.1);
  const prevSfxRef = useRef((settings.sfxVolume ?? 0.5) > 0 ? (settings.sfxVolume ?? 0.5) : 0.5);
  const prevVoiceRef = useRef((settings.voiceVolume ?? 0.7) > 0 ? (settings.voiceVolume ?? 0.7) : 0.7);
  const stressRef = useRef(0);
  stressRef.current = stressLevel;

  useEffect(() => {
    let cancelled = false;
    const loadCase = async () => {
      try {
        const setting = searchParams.get('setting');
        const params = new URLSearchParams();
        if (setting && setting !== 'random') params.set('setting', setting);
        if (difficulty) params.set('difficulty', difficulty);
        params.set('t', Date.now().toString());
        const caseHeaders: Record<string, string> = { ...getUserApiHeaders() };
        const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('appSettings') : null;
        if (stored) { try { if (JSON.parse(stored).timerMode === 'unlimited') caseHeaders['x-timer-mode'] = 'unlimited'; } catch {} }
        const attempt = async () => { const res = await fetchWithTimeout(`/api/generate-case?${params}`, { cache: 'no-store', headers: caseHeaders }, 30000); return res.json(); };
        let data;
        try { data = await attempt(); } catch {
          if (!cancelled) showToast("Couldn't generate case — retrying...");
          await new Promise(r => setTimeout(r, 2000));
          if (cancelled) return;
          data = await attempt();
        }
        if (!cancelled) { setCaseData(data); setPhase('briefing'); sfx('folderopen'); }
      } catch (err) {
        console.error('Failed to load case:', err);
        if (!cancelled) router.push('/');
      }
    };
    loadCase();
    return () => { cancelled = true; };
  }, [router, searchParams]);

  useEffect(() => { dialogueEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conversationHistory, lastTranscript, isListening, phase]);
  useEffect(() => { window.dispatchEvent(new CustomEvent('gamePhaseChange', { detail: phase })); }, [phase]);

  useEffect(() => {
    if (phase !== 'active') return;
    const sounds = getNervousSounds(caseData?.suspect_gender);
    const interval = setInterval(() => {
      const s = stressRef.current, t = remaining;
      const tickChance = t <= 60 ? 1.0 : t <= 120 ? 0.7 : 0.3;
      if (Math.random() < tickChance) sfx('clock_tick');
      if (t <= 60 && Math.random() < 0.5) setTimeout(() => sfx('clock_tick'), 3000);
      if (s >= 6 && Math.random() < (s - 5) * 0.15) sfx(sounds[Math.floor(Math.random() * sounds.length)]);
    }, 12000);
    return () => clearInterval(interval);
  }, [phase, sfx, caseData?.suspect_gender, remaining]);
  useEffect(() => { if (accusationsLeft <= 0 && !isAccusing && phase === 'active') handleLose(); }, [accusationsLeft, isAccusing, phase]);
  useEffect(() => { onExpire(() => { handleTimeUp(); }); }, [onExpire]);
  useEffect(() => { if (phase === 'active' && !localStorage.getItem('onboardingComplete')) setShowOnboarding(true); }, [phase]);
  useEffect(() => {
    if (phase !== 'active') return;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('micHintDismissed')) return;
    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: 'microphone' as PermissionName }).then((s) => { if (s.state !== 'granted') setShowMicHint(true); }).catch(() => setShowMicHint(true));
    } else setShowMicHint(true);
  }, [phase]);

  const sendQuestion = useCallback(async (question: string, isOpening = false) => {
    if (!caseData || (!isOpening && phase !== 'active')) return;
    setPhase('processing');
    setLastTranscript(question);
    const newHistory: ConversationMessage[] = [...conversationHistory, { role: 'user', content: question, timestamp: elapsed }];
    try {
      const body = JSON.stringify({ sessionId: caseData.sessionId, playerQuestion: question });
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...getUserApiHeaders() };
      if (isUnlimited) headers['x-timer-mode'] = 'unlimited';
      const opts = { method: 'POST', headers, body };
      let res;
      try { res = await fetchWithTimeout('/api/interrogate', opts); } catch { res = await fetchWithTimeout('/api/interrogate', opts); }
      const data = await res.json();
      if (data.error) { showToast("Couldn't reach the suspect — try again"); setPhase('active'); return; }
      if (data.timeExpired) {
        handleTimeUp();
        return;
      }
      setConversationHistory([...newHistory, { role: 'assistant', content: data.spoken_response, timestamp: elapsed }]);
      setLastResponse(data.spoken_response);
      if (data.lawyered_up) {
        handleLawyerUp(data.spoken_response);
        return;
      }
      const newStress = data.stress_level ?? 0;
      if (newStress > stressRef.current + 1) {
        sfx('tension');
        const sounds = getNervousSounds(caseData?.suspect_gender);
        setTimeout(() => sfx(sounds[Math.floor(Math.random() * sounds.length)]), 800);
      }
      setStressLevel(newStress);
      setMaxStress((prev) => Math.max(prev, newStress));
      if (data.clue_unlocked && !isOpening) {
        setClues((prev) => {
          if (prev.length >= cluesNeeded) return prev;
          if (prev.includes(data.clue_unlocked)) return prev;
          const next = [...prev, data.clue_unlocked];
          setClueNotification(next.length);
          sfx('papershuffle');
          setTimeout(() => setClueNotification(null), 3000);
          return next;
        });
      }
      await speakResponse(data.spoken_response, data.stress_level ?? 0, caseData.suspect_name, () => setPhase('active'), settings.ttsEnabled);
    } catch (err) {
      console.error('Failed to interrogate:', err);
      showToast("Couldn't reach the suspect — try again");
      setPhase('active');
    }
  }, [caseData, conversationHistory, phase, speakResponse, settings.ttsEnabled, showToast]);

  const submitAccusation = useCallback(async (text: string) => {
    if (!text || !caseData) { setIsAccusing(false); return; }
    setLastTranscript(text);
    setPhase('processing');
    try {
      const res = await fetchWithTimeout('/api/accuse', { method: 'POST', headers: { 'Content-Type': 'application/json', ...getUserApiHeaders() }, body: JSON.stringify({ sessionId: caseData.sessionId, accusation: text }) });
      const data = await res.json();
      if (data.error) { showToast(data.error); setPhase('active'); setIsAccusing(false); return; }
      if (typeof data.accusationsLeft === 'number') setAccusationsLeft(data.accusationsLeft);
      else setAccusationsLeft((prev) => Math.max(0, prev - 1));
      const updatedHistory: ConversationMessage[] = [...conversationHistory, { role: 'user', content: `[ACCUSATION] ${text}`, timestamp: elapsed }, { role: 'assistant', content: data.confession, timestamp: elapsed }];
      setConversationHistory(updatedHistory);
      setLastResponse(data.confession);
      if (data.correct) {
        sfx('win');
        if (timerRef.current) clearInterval(timerRef.current);
        setLastTranscript('');
        storePatterns('win', updatedHistory, stressLevel, clues.length);
        sessionStorage.setItem('gameResult', JSON.stringify({ type: 'win', caseData, sessionId: caseData.sessionId, winToken: data.winToken || '', conversationHistory: updatedHistory, confession: data.confession, timeElapsed: elapsed, difficulty, stressLevel, cluesFound: clues.length, hintsUsed, accusationsUsed: 3 - (data.accusationsLeft ?? accusationsLeft), questionsAsked: updatedHistory.filter(m => m.role === 'user' && !m.content.startsWith('*') && !m.content.startsWith('[ACCUSATION')).length }));
        try { await speakConfession(data.confession, 10, caseData.suspect_name); } catch {}
        sfx('handcuff');
        setTimeout(() => sfx('stampthud'), 1000);
        setTimeout(() => setFadingOut(true), 1800);
        setTimeout(() => router.push('/game/win'), 2500);
      } else {
        sfx('wrong');
        await speakResponse(data.confession, stressLevel, caseData.suspect_name, () => setPhase('active'), settings.ttsEnabled);
      }
    } catch (err) {
      console.error('Accusation failed:', err);
      showToast("Accusation couldn't be processed — try again");
      setPhase('active');
    }
    setIsAccusing(false);
  }, [caseData, conversationHistory, elapsed, stressLevel, clues.length, hintsUsed, accusationsLeft, speakResponse, speakConfession, settings.ttsEnabled, timerRef, difficulty, router, showToast]);

  const startListening = () => {
    if (phase !== 'active' || isSpeaking) return;
    setLastTranscript('');
    startRecording((t) => { setIsListening(false); setLastTranscript(t); sendQuestion(t); }, (msg) => { setIsListening(false); setLastTranscript(msg); }, setLastTranscript);
  };

  const startAccusation = () => {
    if (phase !== 'active' || isSpeaking || accusationsLeft <= 0) return;
    setIsAccusing(true);
    startRecording(async (t) => { setIsListening(false); await submitAccusation(t); }, (msg) => { setIsListening(false); setIsAccusing(false); setLastTranscript(msg); }, setLastTranscript);
  };

  if (phase === 'loading') return <LoadingScreen />;
  if (phase === 'briefing' && caseData) return <BriefingScreen caseData={caseData} difficulty={difficulty} onStart={() => sendQuestion('*Detective sits down and opens the case file*', true)} onBack={() => router.push('/cases')} />;

  return (
    <motion.div
      initial="hidden" animate="visible" variants={fadeIn} transition={smooth}
      className={`h-screen flex flex-col overflow-hidden max-w-[1400px] mx-auto w-full relative border border-surface-darker ${settings.highContrast ? 'bg-black text-white' : 'bg-black text-foreground'} ${settings.fontSize === 'small' ? 'text-xs' : settings.fontSize === 'large' ? 'text-lg' : 'text-base'} ${settings.highContrast ? 'high-contrast' : ''}`}
      style={{ fontFamily: settings.fontFamily === 'dyslexia' ? '"OpenDyslexic", sans-serif' : settings.fontFamily === 'sans' ? 'system-ui, -apple-system, sans-serif' : 'var(--font-mono)' }}
    >
      <TopBar remaining={remaining} elapsed={elapsed} timeLimit={timeLimit} isUnlimited={isUnlimited} stressLevel={stressLevel} musicVolume={settings.musicVolume} onMusicToggle={() => {
        if (settings.musicVolume > 0 || (settings.sfxVolume ?? 0.5) > 0 || (settings.voiceVolume ?? 0.7) > 0) {
          prevVolumeRef.current = settings.musicVolume || 0.05;
          prevSfxRef.current = (settings.sfxVolume ?? 0.5) || 0.5;
          prevVoiceRef.current = (settings.voiceVolume ?? 0.7) || 0.7;
          updateSettings({ ...settings, musicVolume: 0, sfxVolume: 0, voiceVolume: 0 });
        } else {
          updateSettings({ ...settings, musicVolume: prevVolumeRef.current || 0.05, sfxVolume: prevSfxRef.current || 0.5, voiceVolume: prevVoiceRef.current || 0.7 });
        }
      }} />
      <MicPermissionBanner show={showMicHint} onDismiss={() => { setShowMicHint(false); sessionStorage.setItem('micHintDismissed', '1'); }} />
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-0 overflow-hidden">
        {caseData ? <SuspectZone caseData={caseData} stressLevel={stressLevel} isSpeaking={isSpeaking} isListening={isListening} lastTranscript={lastTranscript} lastResponse={lastResponse} phase={phase} onSkipSpeech={skipSpeech} /> : <div className="lg:col-span-2 flex items-center justify-center p-4 border-r border-surface-darker bg-black" />}
        {caseData && <CaseFile caseData={caseData} clues={clues} clueIcons={clueIcons} cluesNeeded={cluesNeeded} hintsUsed={hintsUsed} hintTexts={hintTexts} conversationHistory={conversationHistory} />}
      </div>
      <ClueNotification clueNumber={clueNotification} clueIcons={clueIcons} cluesNeeded={cluesNeeded} />
      <TextInputPanel show={showTextInput} disabled={phase !== 'active' || isSpeaking || isAccusing} onSubmit={(v) => { sfx('click_short'); sendQuestion(v); }} onMic={() => { setShowTextInput(false); startListening(); }} onClickOutside={() => setShowTextInput(false)} />
      <NotesPanel show={showNotes} notes={notes} pos={notesPos} onChange={setNotes} onClose={() => setShowNotes(false)} onPosChange={setNotesPos} />
      <ExitConfirmDialog show={showExitConfirm} onConfirm={() => { if (timerRef.current) clearInterval(timerRef.current); if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } speechSynthesis.cancel(); router.push('/cases'); }} onCancel={() => setShowExitConfirm(false)} />
      <GiveUpConfirmDialog show={showGiveUpConfirm} onConfirm={handleGiveUp} onCancel={() => setShowGiveUpConfirm(false)} />
      <AccuseConfirmDialog show={showAccuseConfirm} accusationsLeft={accusationsLeft} accuseText={accuseText} onChange={setAccuseText} onSubmitText={(v) => { setShowAccuseConfirm(false); setIsAccusing(true); submitAccusation(v); setAccuseText(''); }} onVoice={() => { setShowAccuseConfirm(false); startAccusation(); }} onCancel={() => { setShowAccuseConfirm(false); setAccuseText(''); }} onClickOutside={() => { setShowAccuseConfirm(false); setAccuseText(''); }} />
      <SettingsPanel show={showSettings} settings={settings} pos={settingsPos} onSettingsChange={updateSettings} onClose={() => setShowSettings(false)} onPosChange={setSettingsPos} />
      <HelpPanel show={showHelp} pos={helpPos} cluesNeeded={cluesNeeded} clueIcons={clueIcons} isUnlimited={isUnlimited} difficulty={difficulty} onClose={() => setShowHelp(false)} onPosChange={setHelpPos} />
      <Dock isListening={isListening} isSpeaking={isSpeaking} isAccusing={isAccusing} phase={phase} showTextInput={showTextInput} showNotes={showNotes} showSettings={showSettings} showAccuseConfirm={showAccuseConfirm} clues={clues} cluesNeeded={cluesNeeded} accusationsLeft={accusationsLeft} hintsUsed={hintsUsed} caseData={caseData} onMicToggle={() => { sfx(isListening ? 'mic_off' : 'mic_on'); (isListening ? stopListening : startListening)(); }} onTypeToggle={() => { sfx(showTextInput ? 'close' : 'click_short'); setShowTextInput(!showTextInput); }} onNotesToggle={() => { sfx(showNotes ? 'close' : 'paper'); setShowNotes(!showNotes); }}
        onHintClick={async () => {
          sfx('click');
          if (!caseData) return;
          try {
            const res = await fetch('/api/hint', { method: 'POST', headers: { 'Content-Type': 'application/json', ...getUserApiHeaders() }, body: JSON.stringify({ sessionId: caseData.sessionId }) });
            const data = await res.json();
            if (data.hint) { sfx('chime'); setHintsUsed(data.hintsUsed); setHintTexts((prev) => [...prev, data.hint]); }
            else if (data.error) showToast(data.error);
          } catch { showToast('Could not retrieve hint'); }
        }}
        onAccuseClick={isAccusing && isListening ? stopListening : () => { sfx('slam'); setShowAccuseConfirm(true); }} onSettingsToggle={() => { sfx(showSettings ? 'close' : 'click_short'); setShowSettings(!showSettings); }} onGiveUpClick={() => { sfx('click'); setShowGiveUpConfirm(true); }} onHelpToggle={() => { sfx(showHelp ? 'close' : 'click_short'); setShowHelp(!showHelp); }} onExitClick={() => { sfx('click'); setShowExitConfirm(true); }} />
      <AnimatePresence>
        {toast && (<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.25 }} className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-accent/90 text-foreground font-mono text-xs px-4 py-2 rounded border border-accent">{toast}</motion.div>)}
      </AnimatePresence>
      {showOnboarding && <OnboardingOverlay onClose={() => setShowOnboarding(false)} />}
      <AnimatePresence>
        {fadingOut && <motion.div className="fixed inset-0 bg-black z-[100] pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, ease: 'easeIn' }} />}
      </AnimatePresence>
    </motion.div>
  );
}
