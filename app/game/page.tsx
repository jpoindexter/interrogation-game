'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Case } from '@/lib/game-state';
import type { ConversationMessage } from '@/lib/mistral';
import SuspectAvatar from './SuspectAvatar';
import { DIFFICULTY_CLUES, pickRandomIcons, getSceneBg, formatTime } from './components/utils';
import TopBar from './components/TopBar';
import SuspectZone from './components/SuspectZone';
import CaseFile from './components/CaseFile';
import Dock from './components/Dock';
import {
  ClueNotification,
  TextInputPanel,
  NotesPanel,
  ExitConfirmDialog,
  AccuseConfirmDialog,
  SettingsPanel,
  HelpPanel,
} from './components/Panels';

export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0A] text-[#E8E8E8] font-mono flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">GENERATING CASE...</h1>
          <div className="w-12 h-12 border-2 border-[#C41E1E] border-t-transparent rounded-full animate-spin mx-auto" />
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
  const [timer, setTimer] = useState(0);
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
  const [showHelp, setShowHelp] = useState(false);
  const [helpPos, setHelpPos] = useState<{ x: number; y: number } | null>(null);
  const [clueNotification, setClueNotification] = useState<number | null>(null);
  const difficulty = searchParams.get('difficulty') || 'medium';
  const cluesNeeded = DIFFICULTY_CLUES[difficulty] || 3;
  const [clueIcons, setClueIcons] = useState<string[]>(() => pickRandomIcons(cluesNeeded));

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [notesPos, setNotesPos] = useState<{ x: number; y: number } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(() => {
    const defaults = {
      ttsEnabled: process.env.NODE_ENV !== 'development',
      fontSize: 'medium' as 'small' | 'medium' | 'large',
      fontFamily: 'mono' as 'mono' | 'dyslexia' | 'sans',
      highContrast: false,
    };
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('appSettings');
        if (stored) return { ...defaults, ...JSON.parse(stored) };
      } catch { /* ignore */ }
    }
    return defaults;
  });
  // Persist settings changes to localStorage
  const updateSettings = useCallback((next: typeof settings) => {
    setSettings(next);
    localStorage.setItem('appSettings', JSON.stringify(next));
  }, []);
  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<number>(0);
  const rafSilenceRef = useRef<number>(0);
  const dialogueEndRef = useRef<HTMLDivElement | null>(null);
  const voicesCacheRef = useRef<SpeechSynthesisVoice[]>([]);

  // Preload voices — they load async so we cache them early
  useEffect(() => {
    const loadVoices = () => { voicesCacheRef.current = speechSynthesis.getVoices(); };
    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  // Pick a browser voice matching suspect gender
  const pickBrowserVoice = useCallback((utterance: SpeechSynthesisUtterance) => {
    const isFemale = caseData?.suspect_gender?.toLowerCase() === 'female';
    const voices = voicesCacheRef.current.length > 0 ? voicesCacheRef.current : speechSynthesis.getVoices();
    // Prefer en-US voices, then any English voice
    const enVoices = voices.filter(v => v.lang.startsWith('en'));
    if (enVoices.length === 0) return;
    // macOS / Chrome voice names that are clearly gendered
    const femaleNames = ['samantha', 'karen', 'victoria', 'fiona', 'moira', 'tessa', 'allison', 'ava', 'susan', 'zoe'];
    const maleNames = ['daniel', 'alex', 'tom', 'fred', 'ralph', 'lee', 'oliver', 'james', 'aaron', 'gordon'];
    const targetNames = isFemale ? femaleNames : maleNames;
    const match = enVoices.find(v => targetNames.some(n => v.name.toLowerCase().includes(n)));
    if (match) {
      utterance.voice = match;
    } else {
      // No exact match — pick any English voice, adjust pitch to compensate
      utterance.voice = enVoices[0];
    }
    utterance.pitch = isFemale ? 1.15 : 0.8;
  }, [caseData?.suspect_gender]);

  // Load case on mount
  useEffect(() => {
    let cancelled = false;
    const loadCase = async () => {
      try {
        const setting = searchParams.get('setting');
        const params = new URLSearchParams();
        if (setting && setting !== 'random') params.set('setting', setting);
        if (difficulty) params.set('difficulty', difficulty);
        params.set('t', Date.now().toString());
        const res = await fetch(`/api/generate-case?${params}`, { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled) {
          setCaseData(data);
          setPhase('briefing');
        }
      } catch (err) {
        console.error('Failed to load case:', err);
        if (!cancelled) router.push('/');
      }
    };
    loadCase();
    return () => { cancelled = true; };
  }, [router]);

  // Timer counts UP — pauses during processing and TTS
  useEffect(() => {
    if (phase !== 'active' && phase !== 'processing') return;

    // Only tick when the phase is active (not processing, not speaking)
    const shouldTick = phase === 'active' && !isSpeaking;
    if (!shouldTick) {
      // Pause the timer
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, isSpeaking]);

  // Auto-scroll dialogue to bottom
  useEffect(() => {
    dialogueEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory, lastTranscript, isListening, phase]);

  // Lose when all accusations are used up
  useEffect(() => {
    if (accusationsLeft <= 0 && !isAccusing && phase === 'active') {
      handleLose();
    }
  }, [accusationsLeft, isAccusing, phase]);

  // Handle sending a question to Mistral
  const sendQuestion = useCallback(
    async (question: string, isOpening = false) => {
      if (!caseData) return;
      if (!isOpening && phase !== 'active') return;

      setPhase('processing');
      setLastTranscript(question);

      const newHistory: ConversationMessage[] = [
        ...conversationHistory,
        { role: 'user', content: question },
      ];

      try {
        const res = await fetch('/api/interrogate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caseData,
            conversationHistory,
            playerQuestion: question,
          }),
        });

        const data = await res.json();

        if (data.error) {
          console.error('API error:', data.error);
          setPhase('active');
          return;
        }

        // Update conversation with assistant response
        const updatedHistory: ConversationMessage[] = [
          ...newHistory,
          { role: 'assistant', content: data.spoken_response },
        ];
        setConversationHistory(updatedHistory);
        setLastResponse(data.spoken_response);
        setStressLevel(data.stress_level ?? 0);
        setMaxStress((prev) => Math.max(prev, data.stress_level ?? 0));

        if (data.clue_unlocked) {
          setClues((prev) => {
            if (prev.includes(data.clue_unlocked)) return prev;
            const newClues = [...prev, data.clue_unlocked];
            // Show badge notification (1, 2, or 3)
            setClueNotification(newClues.length);
            setTimeout(() => setClueNotification(null), 3000);
            return newClues;
          });
        }

        // Speak the response
        await speakResponse(data.spoken_response, data.stress_level ?? 0);
      } catch (err) {
        console.error('Failed to interrogate:', err);
        setPhase('active');
      }
    },
    [caseData, conversationHistory, phase, timer, router]
  );

  // Ref for current audio so we can stop it
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Skip TTS — stop current speech and return to active
  const skipSpeech = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    speechSynthesis.cancel();
    setIsSpeaking(false);
    setPhase('active');
  }, []);

  // Text-to-speech via ElevenLabs
  const speakResponse = async (text: string, stress: number) => {
    if (!settings.ttsEnabled) {
      setPhase('active');
      return;
    }

    setIsSpeaking(true);

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, stress, suspectName: caseData?.suspect_name, suspectGender: caseData?.suspect_gender }),
      });

      if (!res.ok) throw new Error('TTS failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        setPhase('active');
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        setPhase('active');
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };

      await audio.play();
    } catch (err) {
      console.error('ElevenLabs TTS error, falling back to browser:', err);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      pickBrowserVoice(utterance);
      utterance.onend = () => { setIsSpeaking(false); setPhase('active'); };
      utterance.onerror = () => { setIsSpeaking(false); setPhase('active'); };
      speechSynthesis.speak(utterance);
    }
  };

  // Speak confession — returns promise, waits for audio to finish
  const speakConfession = (text: string, stress: number): Promise<void> => {
    setIsSpeaking(true);
    return new Promise(async (resolve) => {
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, stress, suspectName: caseData?.suspect_name, suspectGender: caseData?.suspect_gender }),
        });
        if (!res.ok) throw new Error('TTS failed');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url); resolve(); };
        audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(url); resolve(); };
        await audio.play();
      } catch {
        // Fallback to browser speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.85;
        pickBrowserVoice(utterance);
        utterance.onend = () => { setIsSpeaking(false); resolve(); };
        utterance.onerror = () => { setIsSpeaking(false); resolve(); };
        speechSynthesis.speak(utterance);
      }
    });
  };

  // Transcribe audio blob via Mistral Voxtral
  const transcribeAudio = async (blob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');
    const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return (data.text ?? '').trim();
  };

  // Silence detection — monitors audio level, stops recording after 2s of silence
  const startSilenceDetection = (stream: MediaStream) => {
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    analyserRef.current = analyser;
    silenceTimerRef.current = 0;

    const data = new Uint8Array(analyser.frequencyBinCount);
    let lastTime = performance.now();

    const check = () => {
      analyser.getByteFrequencyData(data);
      const rms = Math.sqrt(data.reduce((sum, v) => sum + v * v, 0) / data.length);
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (rms < 15) {
        silenceTimerRef.current += dt;
        if (silenceTimerRef.current >= 2) {
          // 2 seconds of silence → auto-stop
          stopListening();
          audioCtx.close();
          return;
        }
      } else {
        silenceTimerRef.current = 0;
      }
      rafSilenceRef.current = requestAnimationFrame(check);
    };
    rafSilenceRef.current = requestAnimationFrame(check);

    return audioCtx;
  };

  // Start recording with MediaRecorder → Voxtral transcription
  const startRecording = async (onTranscript: (transcript: string) => void, onError: (msg: string) => void) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Pick a supported mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop silence detection
        cancelAnimationFrame(rafSilenceRef.current);
        // Stop mic stream
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size < 2000) {
          onError('(no speech detected — try again)');
          return;
        }

        try {
          setLastTranscript('(transcribing...)');
          const transcript = await transcribeAudio(blob);
          if (transcript) {
            onTranscript(transcript);
          } else {
            onError('(no speech detected — try again)');
          }
        } catch (err) {
          console.error('Transcription failed:', err);
          onError('(transcription failed — try again or type below)');
        }
      };

      recorder.start(250); // collect chunks every 250ms
      setIsListening(true);

      // Start silence auto-stop
      startSilenceDetection(stream);
    } catch (err) {
      console.error('Microphone access error:', err);
      onError('(microphone access denied — check browser permissions)');
    }
  };

  // Question recording
  const startListening = () => {
    if (phase !== 'active' || isSpeaking) return;
    setLastTranscript('');
    startRecording(
      (transcript) => {
        setIsListening(false);
        setLastTranscript(transcript);
        sendQuestion(transcript);
      },
      (msg) => {
        setIsListening(false);
        setLastTranscript(msg);
      }
    );
  };

  const stopListening = () => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
    cancelAnimationFrame(rafSilenceRef.current);
    setIsListening(false);
  };

  // Submit an accusation (shared by voice and text)
  const submitAccusation = useCallback(async (accusationText: string) => {
    if (!accusationText || !caseData) {
      setIsAccusing(false);
      return;
    }

    setLastTranscript(accusationText);
    setPhase('processing');
    setAccusationsLeft((prev) => prev - 1);

    try {
      const res = await fetch('/api/accuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseData,
          conversationHistory,
          accusation: accusationText,
        }),
      });
      const data = await res.json();

      if (data.correct) {
        // WIN — suspect confesses
        if (timerRef.current) clearInterval(timerRef.current);
        const updatedHistory: ConversationMessage[] = [
          ...conversationHistory,
          { role: 'user', content: `[ACCUSATION] ${accusationText}` },
          { role: 'assistant', content: data.confession },
        ];
        setConversationHistory(updatedHistory);
        setLastResponse(data.confession);

        sessionStorage.setItem(
          'gameResult',
          JSON.stringify({
            type: 'win',
            caseData,
            conversationHistory: updatedHistory,
            confession: data.confession,
            timeElapsed: timer,
            difficulty,
            stressLevel,
            cluesFound: clues.length,
            hintsUsed,
            accusationsUsed: 3 - accusationsLeft,
          })
        );

        try {
          await speakConfession(data.confession, 10);
        } catch {
          // If speech fails, still navigate
        }
        router.push('/game/win');
      } else {
        // WRONG — suspect deflects
        const updatedHistory: ConversationMessage[] = [
          ...conversationHistory,
          { role: 'user', content: `[ACCUSATION] ${accusationText}` },
          { role: 'assistant', content: data.confession },
        ];
        setConversationHistory(updatedHistory);
        setLastResponse(data.confession);
        await speakResponse(data.confession, stressLevel);
        setPhase('active');
      }
    } catch (err) {
      console.error('Accusation failed:', err);
      setPhase('active');
    }
    setIsAccusing(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseData, conversationHistory, timer, stressLevel, clues.length, hintsUsed, accusationsLeft]);

  // Accusation via voice
  const startAccusation = () => {
    if (phase !== 'active' || isSpeaking || accusationsLeft <= 0) return;
    setIsAccusing(true);
    startRecording(
      async (transcript) => {
        setIsListening(false);
        await submitAccusation(transcript);
      },
      (msg) => {
        setIsListening(false);
        setIsAccusing(false);
        setLastTranscript(msg);
      }
    );
  };

  // Handle lose
  const handleLose = () => {
    sessionStorage.setItem(
      'gameResult',
      JSON.stringify({
        type: 'lose',
        caseData,
        conversationHistory,
        maxStress,
      })
    );
    router.push('/game/lose');
  };

  // Start interrogation (from briefing)
  const startInterrogation = async () => {
    // Get suspect's opening line — sendQuestion handles all phase transitions
    await sendQuestion('*Detective sits down and opens the case file*', true);
  };

  // --- RENDER ---

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-[#E8E8E8] font-mono flex items-center justify-center p-8">
        <div className="max-w-lg text-center">
          <div className="w-12 h-12 border-2 border-[#C41E1E] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-6">GENERATING CASE...</h1>

          <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-6 rounded-lg text-left">
            <h3 className="text-xs uppercase tracking-[0.3em] text-[#C8A050] mb-3">How to Play</h3>
            <div className="space-y-3 text-sm text-gray-400">
              <p><span className="text-[#E8E8E8] font-bold">1. Question.</span> Tap the mic and ask the suspect questions. The stress meter tells you when you&rsquo;re getting close to the lie.</p>
              <p><span className="text-[#C41E1E] font-bold">2. Accuse.</span> When you find a contradiction, hit ACCUSE and state exactly what they lied about. Be specific.</p>
              <p><span className="text-gray-300">3. Win.</span> Get it right and they confess. Get it wrong and you waste an attempt. You get <span className="text-[#E8E8E8]">3 tries</span>.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'briefing' && caseData) {
    return (
      <div
        className="min-h-screen text-[#E8E8E8] font-mono flex items-center justify-center p-8 relative overflow-hidden"
        style={{
          backgroundImage: `url(${getSceneBg(caseData.setting)})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          imageRendering: 'pixelated',
        }}
      >
        <div className="absolute inset-0 bg-black/70" />
        <button
          onClick={() => router.push('/cases')}
          className="absolute top-6 right-6 text-xs text-gray-500 hover:text-white uppercase tracking-wider transition-colors z-20"
        >
          &larr; Cases
        </button>
        <div className="max-w-2xl text-center relative z-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <p className="text-sm uppercase tracking-[0.3em] text-[#C41E1E]">
              Case #{caseData.case_number}
            </p>
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm"
              style={{
                color: difficulty === 'easy' ? '#4CAF50' : difficulty === 'medium' ? '#F59E0B' : difficulty === 'hard' ? '#C41E1E' : '#9333EA',
                border: `1px solid ${difficulty === 'easy' ? '#4CAF5040' : difficulty === 'medium' ? '#F59E0B40' : difficulty === 'hard' ? '#C41E1E40' : '#9333EA40'}`,
              }}
            >
              {difficulty.toUpperCase()}
            </span>
          </div>
          <h1 className="text-4xl font-bold mb-8">BRIEFING</h1>
          <div className="flex justify-center mb-6">
            <SuspectAvatar name={caseData.suspect_name} gender={caseData.suspect_gender} stressLevel={0} size="sm" />
          </div>
          <div className="bg-[#2A2A2A] p-8 rounded-lg mb-6 text-left">
            <p className="text-lg leading-relaxed mb-4">{caseData.briefing}</p>
            <div className="border-t border-gray-600 pt-4 mt-4">
              <p className="text-sm text-gray-400">
                Suspect: <span className="text-[#E8E8E8]">{caseData.suspect_name}</span>
              </p>
              <p className="text-sm text-gray-400">
                Role: <span className="text-[#E8E8E8]">{caseData.suspect_role}</span>
              </p>
              <p className="text-sm text-gray-400">
                Location: <span className="text-[#E8E8E8]">{caseData.setting}</span>
              </p>
            </div>
          </div>

          <button
            onClick={startInterrogation}
            className="px-8 py-4 bg-[#C41E1E] text-white text-xl font-bold rounded-lg hover:bg-red-700 transition-colors"
          >
            BEGIN INTERROGATION
          </button>
        </div>
      </div>
    );
  }

  // Active game + processing
  return (
    <div
      className={`h-screen flex flex-col overflow-hidden max-w-[1400px] mx-auto w-full relative border border-[#2A2A2A] ${
        settings.highContrast ? 'bg-black text-white' : 'bg-[#0A0A0A] text-[#E8E8E8]'
      } ${
        settings.fontSize === 'small' ? 'text-xs' : settings.fontSize === 'large' ? 'text-lg' : 'text-base'
      } ${settings.highContrast ? 'high-contrast' : ''}`}
      style={{
        fontFamily: settings.fontFamily === 'dyslexia'
          ? '"OpenDyslexic", sans-serif'
          : settings.fontFamily === 'sans'
            ? 'system-ui, -apple-system, sans-serif'
            : 'var(--font-mono)',
      }}
    >
      <TopBar timer={timer} stressLevel={stressLevel} />

      {/* Main content */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-0">
        {/* Suspect Zone — 2/3 */}
        {caseData ? (
          <SuspectZone
            caseData={caseData}
            stressLevel={stressLevel}
            isSpeaking={isSpeaking}
            isListening={isListening}
            lastTranscript={lastTranscript}
            lastResponse={lastResponse}
            phase={phase}
          />
        ) : (
          <div className="lg:col-span-2 flex items-center justify-center p-4 border-r border-[#2A2A2A] bg-[#0A0A0A]" />
        )}

        {/* Case File — 1/3 */}
        {caseData && (
          <CaseFile
            caseData={caseData}
            clues={clues}
            clueIcons={clueIcons}
            cluesNeeded={cluesNeeded}
            hintsUsed={hintsUsed}
            conversationHistory={conversationHistory}
          />
        )}
      </div>

      <ClueNotification clueNumber={clueNotification} clueIcons={clueIcons} cluesNeeded={cluesNeeded} />

      <TextInputPanel
        show={showTextInput}
        value={textInput}
        disabled={phase !== 'active' || isSpeaking || isAccusing}
        onChange={setTextInput}
        onSubmit={(v) => { sendQuestion(v); setTextInput(''); }}
      />

      <NotesPanel
        show={showNotes}
        notes={notes}
        pos={notesPos}
        onChange={setNotes}
        onClose={() => setShowNotes(false)}
        onPosChange={setNotesPos}
      />

      <ExitConfirmDialog
        show={showExitConfirm}
        onConfirm={() => {
          if (timerRef.current) clearInterval(timerRef.current);
          if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
          speechSynthesis.cancel();
          router.push('/cases');
        }}
        onCancel={() => setShowExitConfirm(false)}
      />

      <AccuseConfirmDialog
        show={showAccuseConfirm}
        accusationsLeft={accusationsLeft}
        accuseText={accuseText}
        onChange={setAccuseText}
        onSubmitText={(v) => {
          setShowAccuseConfirm(false);
          setIsAccusing(true);
          submitAccusation(v);
          setAccuseText('');
        }}
        onVoice={() => { setShowAccuseConfirm(false); startAccusation(); }}
        onCancel={() => { setShowAccuseConfirm(false); setAccuseText(''); }}
      />

      <SettingsPanel
        show={showSettings}
        settings={settings}
        onSettingsChange={updateSettings}
        onClose={() => setShowSettings(false)}
      />

      <HelpPanel
        show={showHelp}
        pos={helpPos}
        cluesNeeded={cluesNeeded}
        clueIcons={clueIcons}
        onClose={() => setShowHelp(false)}
        onPosChange={setHelpPos}
      />

      <Dock
        isListening={isListening}
        isSpeaking={isSpeaking}
        isAccusing={isAccusing}
        phase={phase}
        showTextInput={showTextInput}
        showNotes={showNotes}
        showSettings={showSettings}
        showAccuseConfirm={showAccuseConfirm}
        clues={clues}
        cluesNeeded={cluesNeeded}
        accusationsLeft={accusationsLeft}
        hintsUsed={hintsUsed}
        caseData={caseData}
        onMicToggle={isListening ? stopListening : startListening}
        onTypeToggle={() => setShowTextInput(!showTextInput)}
        onNotesToggle={() => setShowNotes(!showNotes)}
        onHintClick={() => {
          if (caseData && hintsUsed < Math.min(cluesNeeded, caseData.stress_triggers.length)) {
            setHintsUsed((prev) => prev + 1);
          }
        }}
        onAccuseClick={isAccusing && isListening ? stopListening : () => setShowAccuseConfirm(true)}
        onSettingsToggle={() => setShowSettings(!showSettings)}
        onHelpToggle={() => setShowHelp(!showHelp)}
        onExitClick={() => setShowExitConfirm(true)}
      />
    </div>
  );
}
