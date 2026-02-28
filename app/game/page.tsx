'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Case } from '@/lib/game-state';
import type { ConversationMessage } from '@/lib/mistral';
import SuspectAvatar from './SuspectAvatar';

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

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Load case on mount
  useEffect(() => {
    let cancelled = false;
    const loadCase = async () => {
      try {
        const setting = searchParams.get('setting');
        const params = new URLSearchParams();
        if (setting && setting !== 'random') params.set('setting', setting);
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

  // Timer countdown
  useEffect(() => {
    if (phase !== 'active') return;

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
  }, [phase]);

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
          setClues((prev) =>
            prev.includes(data.clue_unlocked) ? prev : [...prev, data.clue_unlocked]
          );
        }

        // Check if caught
        if (data.caught) {
          if (timerRef.current) clearInterval(timerRef.current);
          // Store game data and navigate to win
          sessionStorage.setItem(
            'gameResult',
            JSON.stringify({
              type: 'win',
              caseData,
              conversationHistory: updatedHistory,
              timeRemaining: timer,
              stressLevel: data.stress_level,
            })
          );
          router.push('/game/win');
          return;
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

  // Text-to-speech via ElevenLabs
  const speakResponse = async (text: string, stress: number) => {
    setIsSpeaking(true);

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, stress }),
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
      // Fallback to browser SpeechSynthesis
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.onend = () => { setIsSpeaking(false); setPhase('active'); };
      utterance.onerror = () => { setIsSpeaking(false); setPhase('active'); };
      speechSynthesis.speak(utterance);
    }
  };

  // Speech recognition
  const startListening = () => {
    if (phase !== 'active' || isSpeaking) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('Speech recognition not supported in this browser. Try Chrome.');
      return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      if (transcript.trim()) {
        sendQuestion(transcript);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
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
      <div className="min-h-screen bg-[#0A0A0A] text-[#E8E8E8] font-mono flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">GENERATING CASE...</h1>
          <div className="w-12 h-12 border-2 border-[#C41E1E] border-t-transparent rounded-full animate-spin mx-auto" />
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
          <p className="text-sm uppercase tracking-[0.3em] text-[#C41E1E] mb-4">
            Case #{caseData.case_number}
          </p>
          <h1 className="text-4xl font-bold mb-8">BRIEFING</h1>
          <div className="flex justify-center mb-6">
            <SuspectAvatar name={caseData.suspect_name} stressLevel={0} size="sm" />
          </div>
          <div className="bg-[#2A2A2A] p-8 rounded-lg mb-8 text-left">
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
          <p className="text-sm text-gray-400 mb-8">
            You have 10 minutes. Use your voice. Find the lie.
          </p>
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
    <div className="min-h-screen bg-[#0A0A0A] text-[#E8E8E8] font-mono flex flex-col">
      {/* Top bar — Timer + Stress */}
      <div className="p-4 border-b border-[#2A2A2A]">
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
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-0">
        {/* Suspect Zone — 2/3 */}
        <div
          className="lg:col-span-2 flex flex-col items-center justify-end p-8 border-r border-[#2A2A2A] relative overflow-hidden"
          style={{
            backgroundImage: `url(${caseData ? getSceneBg(caseData.setting) : '/bg/office.png'})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            imageRendering: 'pixelated',
          }}
        >
          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-black/50" />
          {/* Dialogue box — Darkside Detective style */}
          {caseData && (
            <div
              className="w-full max-w-xl border border-[#3A3A4A] rounded-sm p-5 relative z-10"
              style={{ background: 'rgba(10, 12, 18, 0.88)' }}
            >
              <div className="flex gap-5">
                {/* Portrait */}
                <SuspectAvatar name={caseData.suspect_name} stressLevel={stressLevel} />

                {/* Name + dialogue */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-[#C8A050] font-bold text-base mb-3 tracking-wide">
                    {caseData.suspect_name}
                  </h3>

                  {lastResponse ? (
                    <p className="text-[#B8B8C8] text-sm leading-relaxed">
                      {lastResponse}
                    </p>
                  ) : phase === 'processing' ? (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 bg-[#F59E0B] rounded-full animate-pulse" />
                      <span className="text-gray-500 text-sm">...</span>
                    </div>
                  ) : (
                    <p className="text-gray-600 text-sm italic">
                      Waiting to speak...
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Waveform — below dialogue box */}
          <div className="h-16 flex items-center justify-center mt-6 relative z-10">
            {isSpeaking ? (
              <div className="flex items-end gap-[3px]">
                {Array.from({ length: 24 }).map((_, i) => {
                  const peak = 20 + Math.sin(i * 0.7) * 40 + Math.random() * 30;
                  const mid = 10 + Math.cos(i * 1.1) * 20 + Math.random() * 15;
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
                {Array.from({ length: 24 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-[#2A2A2A] rounded-full"
                    style={{ height: '4px' }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Case File — 1/3 */}
        <div className="p-6 bg-[#111111] overflow-y-auto max-h-[calc(100vh-200px)]">
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
                  Clues ({clues.length})
                </h3>
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
                  <p className="text-sm text-gray-600">No clues uncovered yet.</p>
                )}
              </div>

              <div>
                <h3 className="text-xs uppercase tracking-wider text-gray-600 mb-2">
                  Exchange Log
                </h3>
                <div className="space-y-2">
                  {conversationHistory
                    .filter((msg) => msg.role === 'user' && !msg.content.startsWith('*'))
                    .map((msg, i) => (
                      <p key={i} className="text-xs text-gray-500">
                        &gt; {msg.content}
                      </p>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="p-6 border-t border-[#2A2A2A] flex flex-col items-center">
        <button
          onClick={isListening ? stopListening : startListening}
          disabled={phase === 'processing' || isSpeaking}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
            isListening
              ? 'bg-[#C41E1E] scale-110 shadow-[0_0_30px_rgba(196,30,30,0.5)]'
              : phase === 'processing' || isSpeaking
                ? 'bg-[#2A2A2A] opacity-50 cursor-not-allowed'
                : 'bg-[#2A2A2A] hover:bg-[#3A3A3A] hover:scale-105'
          }`}
        >
          {isListening ? (
            <div className="w-6 h-6 bg-white rounded-sm" />
          ) : (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>

        <p className="mt-3 text-xs uppercase tracking-wider text-gray-500">
          {isListening
            ? 'Listening...'
            : isSpeaking
              ? 'Suspect speaking...'
              : phase === 'processing'
                ? 'Processing...'
                : 'Tap to speak'}
        </p>

        {lastTranscript && !isListening && (
          <p className="mt-2 text-xs text-gray-600">
            You said: &ldquo;{lastTranscript}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}
