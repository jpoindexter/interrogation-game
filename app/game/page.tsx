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
import { Spinner } from '../components/ui';
import { motion, AnimatePresence, fadeIn, smooth } from '../components/motion';

export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-foreground font-mono flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">GENERATING CASE...</h1>
          <Spinner />
        </div>
      </div>
    }>
      <GameContent />
    </Suspense>
  );
}

function GameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Game state
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [phase, setPhase] = useState<'loading' | 'briefing' | 'active' | 'processing'>('loading');
  const [stressLevel, setStressLevel] = useState(0);
  const [maxStress, setMaxStress] = useState(0);
  const [clues, setClues] = useState<string[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [lastResponse, setLastResponse] = useState('');
  const [hintsUsed, setHintsUsed] = useState(0);
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
  const [textInput, setTextInput] = useState('');
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [notesPos, setNotesPos] = useState<{ x: number; y: number } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMicHint, setShowMicHint] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000); }, []);
  const [settings, setSettings] = useState(() => {
    const d = { ttsEnabled: process.env.NODE_ENV !== 'development', fontSize: 'medium' as const, fontFamily: 'mono' as const, highContrast: false };
    if (typeof window !== 'undefined') { try { const s = localStorage.getItem('appSettings'); if (s) return { ...d, ...JSON.parse(s) }; } catch {} }
    return d;
  });
  const updateSettings = useCallback((next: typeof settings) => { setSettings(next); localStorage.setItem('appSettings', JSON.stringify(next)); }, []);
  const { isListening, setIsListening, startRecording, stopListening } = useVoiceRecorder();
  const { isSpeaking, audioRef, speakResponse, speakConfession, skipSpeech } = useTTS(caseData?.suspect_gender);
  const { timer, timerRef } = useGameTimer(phase, isSpeaking);
  const dialogueEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let cancelled = false;
    const loadCase = async () => {
      try {
        const setting = searchParams.get('setting');
        const params = new URLSearchParams();
        if (setting && setting !== 'random') params.set('setting', setting);
        if (difficulty) params.set('difficulty', difficulty);
        params.set('t', Date.now().toString());
        const url = `/api/generate-case?${params}`;
        const attempt = async () => { const res = await fetchWithTimeout(url, { cache: 'no-store' }, 30000); return res.json(); };
        let data;
        try { data = await attempt(); } catch {
          if (!cancelled) showToast("Couldn't generate case — retrying...");
          await new Promise(r => setTimeout(r, 2000));
          if (cancelled) return;
          data = await attempt();
        }
        if (!cancelled) { setCaseData(data); setPhase('briefing'); }
      } catch (err) {
        console.error('Failed to load case:', err);
        if (!cancelled) router.push('/');
      }
    };
    loadCase();
    return () => { cancelled = true; };
  }, [router, searchParams]);
  useEffect(() => { dialogueEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conversationHistory, lastTranscript, isListening, phase]);
  useEffect(() => { if (accusationsLeft <= 0 && !isAccusing && phase === 'active') handleLose(); }, [accusationsLeft, isAccusing, phase]);
  useEffect(() => {
    if (phase !== 'active') return;
    if (localStorage.getItem('onboardingComplete')) return;
    setShowOnboarding(true);
  }, [phase]);
  useEffect(() => {
    if (phase !== 'active') return;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('micHintDismissed')) return;
    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: 'microphone' as PermissionName }).then((status) => {
        if (status.state === 'prompt' || status.state === 'denied') setShowMicHint(true);
      }).catch(() => { setShowMicHint(true); });
    } else {
      setShowMicHint(true);
    }
  }, [phase]);
  const sendQuestion = useCallback(
    async (question: string, isOpening = false) => {
      if (!caseData) return;
      if (!isOpening && phase !== 'active') return;

      setPhase('processing');
      setLastTranscript(question);
      const newHistory: ConversationMessage[] = [...conversationHistory, { role: 'user', content: question }];

      try {
        const questionCount = conversationHistory.filter(m => m.role === 'assistant').length;
        const interrogateBody = JSON.stringify({ caseData, conversationHistory, playerQuestion: question, questionCount, currentStress: stressLevel });
        const interrogateOpts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: interrogateBody };
        let res;
        try { res = await fetchWithTimeout('/api/interrogate', interrogateOpts); }
        catch { res = await fetchWithTimeout('/api/interrogate', interrogateOpts); }
        const data = await res.json();
        if (data.error) { console.error('API error:', data.error); showToast("Couldn't reach the suspect — try again"); setPhase('active'); return; }

        const updatedHistory: ConversationMessage[] = [...newHistory, { role: 'assistant', content: data.spoken_response }];
        setConversationHistory(updatedHistory);
        setLastResponse(data.spoken_response);
        setStressLevel(data.stress_level ?? 0);
        setMaxStress((prev) => Math.max(prev, data.stress_level ?? 0));

        if (data.clue_unlocked) {
          setClues((prev) => {
            if (prev.includes(data.clue_unlocked)) return prev;
            const newClues = [...prev, data.clue_unlocked];
            setClueNotification(newClues.length);
            setTimeout(() => setClueNotification(null), 3000);
            return newClues;
          });
        }

        await speakResponse(data.spoken_response, data.stress_level ?? 0, caseData.suspect_name, () => setPhase('active'), settings.ttsEnabled);
      } catch (err) {
        console.error('Failed to interrogate:', err);
        showToast("Couldn't reach the suspect — try again");
        setPhase('active');
      }
    },
    [caseData, conversationHistory, phase, speakResponse, settings.ttsEnabled, showToast]
  );

  // Submit accusation
  const submitAccusation = useCallback(async (accusationText: string) => {
    if (!accusationText || !caseData) { setIsAccusing(false); return; }

    setLastTranscript(accusationText);
    setPhase('processing');
    setAccusationsLeft((prev) => prev - 1);

    try {
      const res = await fetchWithTimeout('/api/accuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseData, conversationHistory, accusation: accusationText }),
      });
      const data = await res.json();

      if (data.correct) {
        if (timerRef.current) clearInterval(timerRef.current);
        const updatedHistory: ConversationMessage[] = [
          ...conversationHistory,
          { role: 'user', content: `[ACCUSATION] ${accusationText}` },
          { role: 'assistant', content: data.confession },
        ];
        setConversationHistory(updatedHistory);
        setLastResponse(data.confession);

        sessionStorage.setItem('gameResult', JSON.stringify({
          type: 'win', caseData, conversationHistory: updatedHistory, confession: data.confession,
          timeElapsed: timer, difficulty, stressLevel, cluesFound: clues.length, hintsUsed, accusationsUsed: 3 - accusationsLeft,
        }));

        try { await speakConfession(data.confession, 10, caseData.suspect_name); } catch { /* still navigate */ }
        router.push('/game/win');
      } else {
        const updatedHistory: ConversationMessage[] = [
          ...conversationHistory,
          { role: 'user', content: `[ACCUSATION] ${accusationText}` },
          { role: 'assistant', content: data.confession },
        ];
        setConversationHistory(updatedHistory);
        setLastResponse(data.confession);
        await speakResponse(data.confession, stressLevel, caseData.suspect_name, () => setPhase('active'), settings.ttsEnabled);
      }
    } catch (err) {
      console.error('Accusation failed:', err);
      showToast("Accusation couldn't be processed — try again");
      setAccusationsLeft((prev) => prev + 1);
      setPhase('active');
    }
    setIsAccusing(false);
  }, [caseData, conversationHistory, timer, stressLevel, clues.length, hintsUsed, accusationsLeft, speakResponse, speakConfession, settings.ttsEnabled, timerRef, difficulty, router, showToast]);

  // Voice-based question
  const startListening = () => {
    if (phase !== 'active' || isSpeaking) return;
    setLastTranscript('');
    startRecording(
      (transcript) => { setIsListening(false); setLastTranscript(transcript); sendQuestion(transcript); },
      (msg) => { setIsListening(false); setLastTranscript(msg); },
      setLastTranscript,
    );
  };

  // Voice-based accusation
  const startAccusation = () => {
    if (phase !== 'active' || isSpeaking || accusationsLeft <= 0) return;
    setIsAccusing(true);
    startRecording(
      async (transcript) => { setIsListening(false); await submitAccusation(transcript); },
      (msg) => { setIsListening(false); setIsAccusing(false); setLastTranscript(msg); },
      setLastTranscript,
    );
  };

  const handleLose = () => {
    sessionStorage.setItem('gameResult', JSON.stringify({ type: 'lose', caseData, conversationHistory, maxStress }));
    router.push('/game/lose');
  };

  const handleGiveUp = useCallback(async () => {
    setShowGiveUpConfirm(false);
    if (!caseData) return;

    setPhase('processing');
    if (timerRef.current) clearInterval(timerRef.current);

    let cleverRemark = '';
    try {
      const res = await fetch('/api/interrogate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseData,
          conversationHistory,
          playerQuestion: '[SYSTEM: The detective has given up and is leaving. Respond with one short, smug, clever remark as the suspect who got away with it. Be condescending. Max 2 sentences.]',
        }),
      });
      const data = await res.json();
      if (data.spoken_response) {
        cleverRemark = data.spoken_response;
        setLastResponse(cleverRemark);
        await speakResponse(cleverRemark, 1, caseData.suspect_name, () => {}, settings.ttsEnabled);
      }
    } catch { /* still navigate */ }

    sessionStorage.setItem('gameResult', JSON.stringify({
      type: 'lose',
      caseData,
      conversationHistory,
      maxStress,
      gaveUp: true,
      cleverRemark,
    }));
    router.push('/game/lose');
  }, [caseData, conversationHistory, maxStress, timerRef, speakResponse, settings.ttsEnabled, router]);

  const startInterrogation = async () => {
    await sendQuestion('*Detective sits down and opens the case file*', true);
  };

  // --- RENDER ---

  if (phase === 'loading') return <LoadingScreen />;

  if (phase === 'briefing' && caseData) {
    return <BriefingScreen caseData={caseData} difficulty={difficulty} onStart={startInterrogation} onBack={() => router.push('/cases')} />;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      transition={smooth}
      className={`h-screen flex flex-col overflow-hidden max-w-[1400px] mx-auto w-full relative border border-surface ${
        settings.highContrast ? 'bg-black text-white' : 'bg-black text-foreground'
      } ${
        settings.fontSize === 'small' ? 'text-xs' : settings.fontSize === 'large' ? 'text-lg' : 'text-base'
      } ${settings.highContrast ? 'high-contrast' : ''}`}
      style={{
        fontFamily: settings.fontFamily === 'dyslexia' ? '"OpenDyslexic", sans-serif'
          : settings.fontFamily === 'sans' ? 'system-ui, -apple-system, sans-serif'
          : 'var(--font-mono)',
      }}
    >
      <TopBar timer={timer} stressLevel={stressLevel} />
      <MicPermissionBanner show={showMicHint} onDismiss={() => { setShowMicHint(false); sessionStorage.setItem('micHintDismissed', '1'); }} />

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-0">
        {caseData ? (
          <SuspectZone caseData={caseData} stressLevel={stressLevel} isSpeaking={isSpeaking} isListening={isListening} lastTranscript={lastTranscript} lastResponse={lastResponse} phase={phase} />
        ) : (
          <div className="lg:col-span-2 flex items-center justify-center p-4 border-r border-surface bg-black" />
        )}
        {caseData && <CaseFile caseData={caseData} clues={clues} clueIcons={clueIcons} cluesNeeded={cluesNeeded} hintsUsed={hintsUsed} conversationHistory={conversationHistory} />}
      </div>

      <ClueNotification clueNumber={clueNotification} clueIcons={clueIcons} cluesNeeded={cluesNeeded} />
      <TextInputPanel show={showTextInput} value={textInput} disabled={phase !== 'active' || isSpeaking || isAccusing} onChange={setTextInput} onSubmit={(v) => { sendQuestion(v); setTextInput(''); }} />
      <NotesPanel show={showNotes} notes={notes} pos={notesPos} onChange={setNotes} onClose={() => setShowNotes(false)} onPosChange={setNotesPos} />
      <ExitConfirmDialog
        show={showExitConfirm}
        onConfirm={() => { if (timerRef.current) clearInterval(timerRef.current); if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } speechSynthesis.cancel(); router.push('/cases'); }}
        onCancel={() => setShowExitConfirm(false)}
      />
      <GiveUpConfirmDialog
        show={showGiveUpConfirm}
        onConfirm={handleGiveUp}
        onCancel={() => setShowGiveUpConfirm(false)}
      />
      <AccuseConfirmDialog show={showAccuseConfirm} accusationsLeft={accusationsLeft} accuseText={accuseText} onChange={setAccuseText}
        onSubmitText={(v) => { setShowAccuseConfirm(false); setIsAccusing(true); submitAccusation(v); setAccuseText(''); }}
        onVoice={() => { setShowAccuseConfirm(false); startAccusation(); }}
        onCancel={() => { setShowAccuseConfirm(false); setAccuseText(''); }}
      />
      <SettingsPanel show={showSettings} settings={settings} onSettingsChange={updateSettings} onClose={() => setShowSettings(false)} />
      <HelpPanel show={showHelp} pos={helpPos} cluesNeeded={cluesNeeded} clueIcons={clueIcons} onClose={() => setShowHelp(false)} onPosChange={setHelpPos} />

      <Dock
        isListening={isListening} isSpeaking={isSpeaking} isAccusing={isAccusing} phase={phase}
        showTextInput={showTextInput} showNotes={showNotes} showSettings={showSettings} showAccuseConfirm={showAccuseConfirm}
        clues={clues} cluesNeeded={cluesNeeded} accusationsLeft={accusationsLeft} hintsUsed={hintsUsed} caseData={caseData}
        onMicToggle={isListening ? stopListening : startListening}
        onTypeToggle={() => setShowTextInput(!showTextInput)}
        onNotesToggle={() => setShowNotes(!showNotes)}
        onHintClick={() => { if (caseData && hintsUsed < Math.min(cluesNeeded, caseData.stress_triggers.length)) setHintsUsed((prev) => prev + 1); }}
        onAccuseClick={isAccusing && isListening ? stopListening : () => setShowAccuseConfirm(true)}
        onSettingsToggle={() => setShowSettings(!showSettings)}
        onGiveUpClick={() => setShowGiveUpConfirm(true)}
        onHelpToggle={() => setShowHelp(!showHelp)}
        onExitClick={() => setShowExitConfirm(true)}
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-accent/90 text-foreground font-mono text-xs px-4 py-2 rounded border border-accent"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {showOnboarding && <OnboardingOverlay onClose={() => setShowOnboarding(false)} />}
    </motion.div>
  );
}
