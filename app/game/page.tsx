'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Case } from '@/lib/game-state';
import type { ConversationMessage } from '@/lib/mistral';
import SuspectAvatar from './SuspectAvatar';

// Difficulty → clues needed
const DIFFICULTY_CLUES: Record<string, number> = {
  easy: 2,
  medium: 3,
  hard: 4,
  expert: 5,
};

// Pool of evidence icons — random ones are picked per case
const EVIDENCE_ICONS = [
  '/clues/folder.png',
  '/clues/recorder.png',
  '/clues/recorder2.png',
  '/clues/coffee.png',
  '/clues/clue1.png',
  '/clues/clue2.png',
  '/clues/clue3.png',
  '/clues/notepad_pl.png',
  '/clues/magnifying_glass.png',
  '/clues/handcuffs.png',
  '/clues/key.png',
  '/clues/flashlight.png',
  '/clues/walkie_talkie.png',
];

function pickRandomIcons(count: number): string[] {
  const shuffled = [...EVIDENCE_ICONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Map case setting text to background image
function getSceneBg(setting: string): string {
  const s = setting.toLowerCase();
  if (s.includes('hospital') || s.includes('medical') || s.includes('clinic') || s.includes('doctor') || s.includes('pharma')) return '/bg/medical.png';
  if (s.includes('law') || s.includes('legal') || s.includes('attorney') || s.includes('firm')) return '/bg/lawfirm.png';
  if (s.includes('server') || s.includes('data center') || s.includes('tech') || s.includes('software') || s.includes('cyber')) return '/bg/server.png';
  if (s.includes('startup') || s.includes('co-working') || s.includes('coworking') || s.includes('incubator')) return '/bg/startup.png';
  if (s.includes('bank') || s.includes('trading') || s.includes('finance') || s.includes('hedge') || s.includes('investment') || s.includes('brokerage') || s.includes('stock')) return '/bg/trade.png';
  if (s.includes('police') || s.includes('precinct') || s.includes('station') || s.includes('interrogation')) return '/bg/police.png';
  return '/bg/office.png';
}

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
  const [timer, setTimer] = useState(600);
  const [stressLevel, setStressLevel] = useState(0);
  const [maxStress, setMaxStress] = useState(0);
  const [clues, setClues] = useState<string[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [lastResponse, setLastResponse] = useState('');
  const [hintsUsed, setHintsUsed] = useState(0);
  const [accusationsLeft, setAccusationsLeft] = useState(3);
  const [isAccusing, setIsAccusing] = useState(false);
  const [showAccuseConfirm, setShowAccuseConfirm] = useState(false);
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
  const [settings, setSettings] = useState({
    ttsEnabled: process.env.NODE_ENV !== 'development',
    fontSize: 'medium' as 'small' | 'medium' | 'large',
    fontFamily: 'mono' as 'mono' | 'dyslexia' | 'sans',
    highContrast: false,
  });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

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

  // Timer countdown — pauses during processing and TTS
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
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, isSpeaking]);

  // Auto-scroll dialogue to bottom
  useEffect(() => {
    dialogueEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory, lastTranscript, isListening, phase]);

  // Navigate to lose screen when timer hits 0
  useEffect(() => {
    if (timer === 0 && (phase === 'active' || phase === 'processing')) {
      handleLose();
    }
  }, [timer, phase]);

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

  // Accusation recording
  const startAccusation = () => {
    if (phase !== 'active' || isSpeaking || accusationsLeft <= 0) return;
    setIsAccusing(true);
    startRecording(
      async (transcript) => {
        setIsListening(false);
        if (!transcript || !caseData) {
          setIsAccusing(false);
          return;
        }

        setLastTranscript(transcript);
        setPhase('processing');
        setAccusationsLeft((prev) => prev - 1);

        try {
          const res = await fetch('/api/accuse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              caseData,
              conversationHistory,
              accusation: transcript,
            }),
          });
          const data = await res.json();

          if (data.correct) {
            // WIN — suspect confesses
            if (timerRef.current) clearInterval(timerRef.current);
            const updatedHistory: ConversationMessage[] = [
              ...conversationHistory,
              { role: 'user', content: `[ACCUSATION] ${transcript}` },
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
                timeRemaining: timer,
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
              { role: 'user', content: `[ACCUSATION] ${transcript}` },
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

  // Format timer
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
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
      {/* Top bar — Timer + Stress */}
      <div className="p-3 border-b border-[#2A2A2A] flex-shrink-0">
        <div className="flex items-center gap-6">
          {/* Timer */}
          <div
            className={`text-4xl font-bold tabular-nums ${
              timer < 60 ? 'text-[#C41E1E] animate-pulse' : ''
            }`}
          >
            {formatTime(timer)}
          </div>

          {/* Stress meter */}
          <div className="flex-1">
            <div className="flex justify-between text-xs uppercase tracking-wider mb-1">
              <span className="text-gray-500">Stress Level</span>
              <span className={stressLevel > 6 ? 'text-[#C41E1E]' : 'text-gray-400'}>
                {stressLevel}/10
              </span>
            </div>
            <div className="h-3 bg-[#2A2A2A] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${(stressLevel / 10) * 100}%`,
                  backgroundColor:
                    stressLevel <= 3
                      ? '#E8E8E8'
                      : stressLevel <= 6
                        ? '#F59E0B'
                        : '#C41E1E',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-0">
        {/* Suspect Zone — 2/3 */}
        <div
          className="lg:col-span-2 flex flex-col items-center justify-center p-4 border-r border-[#2A2A2A] relative overflow-hidden"
          style={{
            backgroundImage: `url(${caseData ? getSceneBg(caseData.setting) : '/bg/office.png'})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            imageRendering: 'pixelated',
          }}
        >
          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-black/40" />

          {caseData && (
            <div className="relative z-10 flex flex-col items-center w-full">
              {/* Bust portrait — centered */}
              <div className="mb-2">
                <SuspectAvatar name={caseData.suspect_name} gender={caseData.suspect_gender} stressLevel={stressLevel} size="md" speaking={isSpeaking} />
              </div>

              {/* Waveform — under portrait when speaking */}
              <div className="h-6 flex items-center justify-center mb-2 gap-3">
                {isSpeaking ? (
                  <div className="flex items-end gap-[3px]">
                    {Array.from({ length: 20 }).map((_, i) => {
                      const peak = 12 + Math.sin(i * 0.7) * 20 + Math.random() * 15;
                      const mid = 6 + Math.cos(i * 1.1) * 10 + Math.random() * 8;
                      const speed = 0.3 + (i % 5) * 0.08 + Math.random() * 0.15;
                      return (
                        <div
                          key={i}
                          className="w-1 bg-[#C41E1E] rounded-full animate-waveform"
                          style={{
                            ['--wave-peak' as string]: `${peak}px`,
                            ['--wave-mid' as string]: `${mid}px`,
                            ['--wave-speed' as string]: `${speed}s`,
                            animationDelay: `${i * 0.04}s`,
                          }}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-end gap-[3px]">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div key={i} className="w-1 bg-[#2A2A2A] rounded-full" style={{ height: '3px' }} />
                    ))}
                  </div>
                )}
              </div>

              {/* Dialogue box — shows both you and suspect */}
              <div
                className="w-full max-w-xl border border-[#3A3A4A] rounded-sm p-4 space-y-3"
                style={{ background: 'rgba(10, 12, 18, 0.88)', minHeight: '120px' }}
              >
                {/* You */}
                <div>
                  <span className="text-gray-500 font-bold text-sm">You</span>
                  {isListening ? (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 bg-[#C41E1E] rounded-full animate-pulse" />
                      <span className="text-gray-400 text-sm italic">Listening...</span>
                    </div>
                  ) : lastTranscript && !lastTranscript.startsWith('(') ? (
                    <p className="text-gray-300 text-sm leading-relaxed mt-1">{lastTranscript}</p>
                  ) : lastTranscript && lastTranscript.startsWith('(') ? (
                    <p className="text-gray-500 text-sm italic mt-1">{lastTranscript}</p>
                  ) : (
                    <p className="text-gray-600 text-sm italic mt-1">Tap the mic to speak...</p>
                  )}
                </div>

                <div className="border-t border-[#2A2A2A]" />

                {/* Suspect */}
                <div>
                  <span className="text-[#C8A050] font-bold text-sm">{caseData.suspect_name}</span>
                  {lastResponse ? (
                    <p className="text-[#B8B8C8] text-sm leading-relaxed mt-1">{lastResponse}</p>
                  ) : phase === 'processing' ? (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 bg-[#F59E0B] rounded-full animate-pulse" />
                      <span className="text-gray-500 text-sm">...</span>
                    </div>
                  ) : (
                    <p className="text-gray-600 text-sm italic mt-1">Waiting to speak...</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Case File — 1/3 */}
        <div className="p-4 bg-[#111111] overflow-y-auto border-l border-[#2A2A2A]">
          <h2 className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4">
            Case File
          </h2>

          {caseData && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs uppercase tracking-wider text-[#C41E1E] mb-2">
                  Crime
                </h3>
                <p className="text-sm text-gray-300">{caseData.crime}</p>
              </div>

              <div>
                <h3 className="text-xs uppercase tracking-wider text-[#C41E1E] mb-2">
                  Suspect
                </h3>
                <p className="text-sm text-gray-300">{caseData.suspect_name}</p>
                <p className="text-xs text-gray-500">{caseData.suspect_role}</p>
              </div>

              <div>
                <h3 className="text-xs uppercase tracking-wider text-[#C41E1E] mb-2">
                  Evidence
                </h3>
                {/* Evidence slots */}
                <div className="flex items-center gap-3 mb-3">
                  {clueIcons.map((icon, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <img
                        src={icon}
                        alt={`Evidence ${i + 1}`}
                        className={`w-20 h-20 object-contain transition-all duration-500 ${
                          clues.length >= i + 1
                            ? 'opacity-100'
                            : 'opacity-20 grayscale'
                        }`}
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>
                  ))}
                </div>
                {/* Clue text */}
                {clues.length > 0 ? (
                  <div className="space-y-2">
                    {clues.map((clue, i) => (
                      <div
                        key={i}
                        className="p-3 bg-[#1A1A1A] rounded border-l-2 border-[#C41E1E]"
                      >
                        <p className="text-sm text-gray-300">{clue}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">Find {cluesNeeded} clues to unlock accusation.</p>
                )}
              </div>

              {/* Hints */}
              {hintsUsed > 0 && (
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-[#F59E0B] mb-2">
                    Hints
                  </h3>
                  <div className="space-y-2">
                    {caseData.stress_triggers.slice(0, hintsUsed).map((trigger, i) => (
                      <div
                        key={i}
                        className="p-3 bg-[#1A1A1A] rounded border-l-2 border-[#F59E0B]"
                      >
                        <p className="text-sm text-gray-300">Try asking about: {trigger}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xs uppercase tracking-wider text-gray-600 mb-2">
                  Exchange Log
                </h3>
                <div className="space-y-2">
                  {conversationHistory
                    .filter((msg) => !(msg.role === 'user' && msg.content.startsWith('*')))
                    .map((msg, i) => (
                      <div key={i} className={`text-xs ${msg.role === 'user' ? 'text-gray-400' : 'text-gray-600'}`}>
                        <span className={msg.role === 'user' ? 'text-gray-500' : 'text-[#C8A050]'}>
                          {msg.role === 'user' ? 'You' : caseData?.suspect_name?.split(' ')[0] ?? 'Suspect'}:
                        </span>{' '}
                        {msg.content}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Clue badge notification */}
      {clueNotification && (
        <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
          <div className="flex flex-col items-center gap-2" style={{ animation: 'clueReveal 0.6s ease-out' }}>
            <img
              src={clueIcons[clueNotification - 1] || clueIcons[0]}
              alt={`Evidence ${clueNotification}`}
              className="w-36 h-36 object-contain drop-shadow-2xl"
              style={{ imageRendering: 'pixelated' }}
            />
            <span className="text-xs uppercase tracking-[0.3em] text-[#C8A050] font-bold">
              Clue {clueNotification} of {cluesNeeded}
            </span>
          </div>
        </div>
      )}

      {/* Text input — floating above dock */}
      {showTextInput && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (textInput.trim() && phase === 'active' && !isSpeaking && !isAccusing) {
                sendQuestion(textInput.trim());
                setTextInput('');
              }
            }}
            className="flex items-center gap-2 bg-[#1A1A1A]/95 backdrop-blur-sm border border-[#2A2A2A] rounded-xl px-3 py-2 shadow-2xl"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={phase === 'active' && !isSpeaking ? 'Type a question and press Enter...' : '...'}
              disabled={phase !== 'active' || isSpeaking || isAccusing}
              autoFocus
              className="flex-1 bg-transparent px-2 py-1 text-sm text-[#E8E8E8] placeholder-gray-600 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || phase !== 'active' || isSpeaking || isAccusing}
              className="px-3 py-1.5 text-xs uppercase tracking-wider bg-[#2A2A2A] text-gray-400 hover:text-[#E8E8E8] hover:bg-[#3A3A3A] rounded-lg border border-[#2A2A2A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Ask
            </button>
          </form>
        </div>
      )}

      {/* Notes — draggable floating panel */}
      {showNotes && (
        <div
          className="absolute z-30 w-[400px] bg-[#111111] border border-[#2A2A2A] rounded-sm shadow-2xl"
          style={{
            left: notesPos ? notesPos.x : '50%',
            top: notesPos ? notesPos.y : '50%',
            transform: notesPos ? 'none' : 'translate(-50%, -50%)',
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-2 border-b border-[#2A2A2A] cursor-grab active:cursor-grabbing select-none"
            onMouseDown={(e) => {
              const panel = e.currentTarget.parentElement!;
              const rect = panel.getBoundingClientRect();
              const parentRect = panel.offsetParent!.getBoundingClientRect();
              dragRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                origX: rect.left - parentRect.left,
                origY: rect.top - parentRect.top,
              };
              const onMove = (ev: MouseEvent) => {
                if (!dragRef.current) return;
                setNotesPos({
                  x: dragRef.current.origX + (ev.clientX - dragRef.current.startX),
                  y: dragRef.current.origY + (ev.clientY - dragRef.current.startY),
                });
              };
              const onUp = () => {
                dragRef.current = null;
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
              };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
          >
            <span className="text-xs uppercase tracking-[0.2em] text-gray-500">Detective Notes</span>
            <button
              onClick={() => setShowNotes(false)}
              className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-[#E8E8E8] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            autoFocus
            placeholder="Write your notes here..."
            className="w-full h-[300px] bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-[#E8E8E8] placeholder-gray-600 focus:outline-none resize-none"
          />
        </div>
      )}

      {/* Popover confirmations */}
      {showExitConfirm && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-[#1A1A1A] border border-[#C41E1E] rounded-sm p-3 w-48 z-40">
          <p className="text-xs text-gray-300 mb-3">Abandon this case?</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (timerRef.current) clearInterval(timerRef.current);
                if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
                speechSynthesis.cancel();
                router.push('/cases');
              }}
              className="flex-1 px-2 py-1.5 text-xs font-bold uppercase bg-[#C41E1E] text-white rounded-sm hover:bg-red-700 transition-colors"
            >
              Leave
            </button>
            <button
              onClick={() => setShowExitConfirm(false)}
              className="flex-1 px-2 py-1.5 text-xs uppercase text-gray-400 border border-[#2A2A2A] rounded-sm hover:text-[#E8E8E8] transition-colors"
            >
              Stay
            </button>
          </div>
        </div>
      )}
      {showAccuseConfirm && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-[#1A1A1A] border border-[#C41E1E] rounded-sm p-3 w-64 z-40">
          <p className="text-xs text-gray-300 mb-3">
            You have <span className="text-[#C41E1E] font-bold">{accusationsLeft}</span> attempt{accusationsLeft !== 1 ? 's' : ''} left. State exactly what you think they lied about.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowAccuseConfirm(false); startAccusation(); }}
              className="flex-1 px-2 py-1.5 text-xs font-bold uppercase bg-[#C41E1E] text-white rounded-sm hover:bg-red-700 transition-colors"
            >
              Accuse
            </button>
            <button
              onClick={() => setShowAccuseConfirm(false)}
              className="flex-1 px-2 py-1.5 text-xs uppercase text-gray-400 border border-[#2A2A2A] rounded-sm hover:text-[#E8E8E8] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div className="absolute bottom-20 right-4 z-40 w-[320px] bg-[#111111] border border-[#2A2A2A] rounded-sm shadow-2xl">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#2A2A2A]">
            <span className="text-xs uppercase tracking-[0.2em] text-gray-500">Settings</span>
            <button
              onClick={() => setShowSettings(false)}
              className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-[#E8E8E8] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="p-4 space-y-4">
            {/* Voice */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Voice (TTS)</span>
              <button
                onClick={() => setSettings((s) => ({ ...s, ttsEnabled: !s.ttsEnabled }))}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  settings.ttsEnabled ? 'bg-[#C41E1E]' : 'bg-[#2A2A2A]'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                  settings.ttsEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {/* Font Size */}
            <div>
              <span className="text-sm text-gray-300 block mb-2">Text Size</span>
              <div className="flex gap-1">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setSettings((s) => ({ ...s, fontSize: size }))}
                    className={`flex-1 px-2 py-1.5 text-xs uppercase tracking-wider rounded-sm transition-colors ${
                      settings.fontSize === size
                        ? 'bg-[#C41E1E] text-white'
                        : 'bg-[#2A2A2A] text-gray-400 hover:text-[#E8E8E8]'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Family */}
            <div>
              <span className="text-sm text-gray-300 block mb-2">Font</span>
              <div className="flex gap-1">
                {([
                  { key: 'mono', label: 'Mono' },
                  { key: 'dyslexia', label: 'Dyslexia' },
                  { key: 'sans', label: 'Sans' },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSettings((s) => ({ ...s, fontFamily: key }))}
                    className={`flex-1 px-2 py-1.5 text-xs uppercase tracking-wider rounded-sm transition-colors ${
                      settings.fontFamily === key
                        ? 'bg-[#C41E1E] text-white'
                        : 'bg-[#2A2A2A] text-gray-400 hover:text-[#E8E8E8]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* High Contrast */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">High Contrast</span>
              <button
                onClick={() => setSettings((s) => ({ ...s, highContrast: !s.highContrast }))}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  settings.highContrast ? 'bg-[#C41E1E]' : 'bg-[#2A2A2A]'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                  settings.highContrast ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Help panel — draggable */}
      {showHelp && (
        <div
          className="absolute z-40 w-[340px] max-h-[70vh] overflow-y-auto bg-[#111111] border border-[#2A2A2A] rounded-sm shadow-2xl"
          style={{
            left: helpPos ? helpPos.x : '50%',
            top: helpPos ? helpPos.y : '50%',
            transform: helpPos ? 'none' : 'translate(-50%, -50%)',
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-2 border-b border-[#2A2A2A] cursor-grab active:cursor-grabbing select-none"
            onMouseDown={(e) => {
              const panel = e.currentTarget.parentElement!;
              const rect = panel.getBoundingClientRect();
              const parentRect = panel.offsetParent!.getBoundingClientRect();
              const startX = e.clientX;
              const startY = e.clientY;
              const origX = rect.left - parentRect.left;
              const origY = rect.top - parentRect.top;
              const onMove = (ev: MouseEvent) => {
                setHelpPos({
                  x: origX + (ev.clientX - startX),
                  y: origY + (ev.clientY - startY),
                });
              };
              const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
              };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
          >
            <span className="text-xs uppercase tracking-[0.2em] text-gray-500">How to Play</span>
            <button
              onClick={() => { setShowHelp(false); setHelpPos(null); }}
              className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-[#E8E8E8] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex gap-3">
              <span className="text-sm font-bold text-[#C41E1E] shrink-0">01</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-1">Ask Questions</p>
                <p className="text-[11px] text-gray-400 leading-relaxed">Tap the mic and ask the suspect questions. Look for inconsistencies in their story.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-sm font-bold text-[#C41E1E] shrink-0">02</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-1">Collect 3 Clues</p>
                <p className="text-[11px] text-gray-400 leading-relaxed">As you press on the right topics, the stress meter rises and you unlock detective badges.</p>
                <div className="flex items-center gap-3 mt-2">
                  {clueIcons.map((icon, i) => (
                    <img key={i} src={icon} alt="" className="w-16 h-16 object-contain" style={{ imageRendering: 'pixelated' }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-sm font-bold text-[#C41E1E] shrink-0">03</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-1">Make Your Accusation</p>
                <p className="text-[11px] text-gray-400 leading-relaxed">Once you have all {cluesNeeded} clues, the ACCUSE button unlocks. Call out the lie. You get 3 attempts.</p>
              </div>
            </div>
            <div className="border-t border-[#2A2A2A] pt-3">
              <p className="text-[10px] uppercase tracking-wider text-[#C8A050] mb-2">Tips</p>
              <ul className="space-y-1.5">
                <li className="text-[11px] text-gray-400 flex gap-2"><span className="text-[#C8A050]">&bull;</span>Ask open-ended questions first</li>
                <li className="text-[11px] text-gray-400 flex gap-2"><span className="text-[#C8A050]">&bull;</span>Rising stress = right track</li>
                <li className="text-[11px] text-gray-400 flex gap-2"><span className="text-[#C8A050]">&bull;</span>Use hints sparingly (-150 pts each)</li>
                <li className="text-[11px] text-gray-400 flex gap-2"><span className="text-[#C8A050]">&bull;</span>More time left = higher score</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* === DOCK === */}
      <div className="flex-shrink-0 flex justify-center p-3 border-t border-[#2A2A2A]">
        <div className="flex items-end gap-1 px-3 py-2 bg-[#1A1A1A]/80 backdrop-blur-sm border border-[#2A2A2A] rounded-2xl">
          {/* Speak */}
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={phase === 'processing' || isSpeaking || isAccusing}
            data-tooltip="Speak"
            className={`dock-icon ${
              isListening
                ? 'bg-[#C41E1E] text-white shadow-[0_0_20px_rgba(196,30,30,0.5)]'
                : 'bg-[#2A2A2A] text-[#E8E8E8]'
            } ${phase === 'processing' || isSpeaking || isAccusing ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {isListening ? (
              <div className="w-4 h-4 bg-white rounded-sm" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </button>

          {/* Type */}
          <button
            onClick={() => setShowTextInput(!showTextInput)}
            data-tooltip="Type"
            className={`dock-icon ${
              showTextInput
                ? 'bg-[#2A2A2A] text-[#E8E8E8] ring-1 ring-[#C8A050]'
                : 'bg-[#2A2A2A] text-gray-500'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <line x1="6" y1="8" x2="6" y2="8" />
              <line x1="10" y1="8" x2="10" y2="8" />
              <line x1="14" y1="8" x2="14" y2="8" />
              <line x1="18" y1="8" x2="18" y2="8" />
              <line x1="6" y1="12" x2="6" y2="12" />
              <line x1="10" y1="12" x2="10" y2="12" />
              <line x1="14" y1="12" x2="14" y2="12" />
              <line x1="18" y1="12" x2="18" y2="12" />
              <line x1="8" y1="16" x2="16" y2="16" />
            </svg>
          </button>

          {/* Notes */}
          <button
            onClick={() => setShowNotes(!showNotes)}
            data-tooltip="Notes"
            className={`dock-icon ${
              showNotes
                ? 'bg-[#2A2A2A] text-[#E8E8E8] ring-1 ring-[#C8A050]'
                : 'bg-[#2A2A2A] text-gray-500'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>

          {/* Divider */}
          <div className="w-px h-8 bg-[#2A2A2A] mx-1" />

          {/* Hint */}
          <button
            onClick={() => {
              if (caseData && hintsUsed < Math.min(cluesNeeded, caseData.stress_triggers.length)) {
                setHintsUsed((prev) => prev + 1);
              }
            }}
            disabled={!caseData || hintsUsed >= Math.min(cluesNeeded, caseData?.stress_triggers?.length ?? 0)}
            data-tooltip={`Hint (${hintsUsed}/${cluesNeeded})`}
            className={`dock-icon ${
              !caseData || hintsUsed >= Math.min(cluesNeeded, caseData?.stress_triggers?.length ?? 0)
                ? 'bg-[#1A1A1A] text-gray-700 cursor-not-allowed'
                : 'bg-[#2A2A2A] text-[#F59E0B]'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>

          {/* Accuse */}
          <button
            onClick={isAccusing && isListening ? stopListening : () => setShowAccuseConfirm(true)}
            disabled={(!isAccusing && (phase === 'processing' || isSpeaking || accusationsLeft <= 0 || clues.length < cluesNeeded || showAccuseConfirm)) || (isAccusing && !isListening)}
            data-tooltip={isAccusing && isListening ? 'Stop' : clues.length < cluesNeeded ? `Find ${cluesNeeded - clues.length} more clue${cluesNeeded - clues.length === 1 ? '' : 's'}` : `Accuse (${accusationsLeft})`}
            className={`dock-icon ${
              (accusationsLeft <= 0 || clues.length < cluesNeeded) && !isAccusing
                ? 'bg-[#1A1A1A] text-gray-700 cursor-not-allowed'
                : isAccusing
                  ? 'bg-[#C41E1E] text-white shadow-[0_0_20px_rgba(196,30,30,0.5)]'
                  : 'bg-[#2A2A2A] text-[#C41E1E]'
            }`}
          >
            {isAccusing && isListening ? (
              <div className="w-4 h-4 bg-white rounded-sm" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            )}
          </button>

          {/* Divider */}
          <div className="w-px h-8 bg-[#2A2A2A] mx-1" />

          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            data-tooltip="Settings"
            className={`dock-icon ${
              showSettings
                ? 'bg-[#2A2A2A] text-[#E8E8E8] ring-1 ring-[#C8A050]'
                : 'bg-[#2A2A2A] text-gray-500'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {/* Help */}
          <button
            onClick={() => setShowHelp(!showHelp)}
            data-tooltip="How to Play"
            className="dock-icon bg-[#2A2A2A] text-gray-500"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>

          {/* Exit */}
          <button
            onClick={() => setShowExitConfirm(true)}
            data-tooltip="Exit"
            className="dock-icon bg-[#2A2A2A] text-gray-500"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
