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
  const [hintsUsed, setHintsUsed] = useState(0);
  const [accusationsLeft, setAccusationsLeft] = useState(3);
  const [isAccusing, setIsAccusing] = useState(false);

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
      // Fallback to browser SpeechSynthesis
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
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
        utterance.onend = () => { setIsSpeaking(false); resolve(); };
        utterance.onerror = () => { setIsSpeaking(false); resolve(); };
        speechSynthesis.speak(utterance);
      }
    });
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

  // Start accusation — records voice, then evaluates
  const startAccusation = () => {
    if (phase !== 'active' || isSpeaking || accusationsLeft <= 0) return;
    setIsAccusing(true);

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('Speech recognition not supported. Try Chrome.');
      setIsAccusing(false);
      return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => { setIsListening(false); setIsAccusing(false); };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      if (!transcript.trim() || !caseData) {
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
        }
      } catch (err) {
        console.error('Accusation failed:', err);
        setPhase('active');
      }
      setIsAccusing(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
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
          <p className="text-sm uppercase tracking-[0.3em] text-[#C41E1E] mb-4">
            Case #{caseData.case_number}
          </p>
          <h1 className="text-4xl font-bold mb-8">BRIEFING</h1>
          <div className="flex justify-center mb-6">
            <SuspectAvatar name={caseData.suspect_name} stressLevel={0} size="sm" />
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

          {/* How to win */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-6 rounded-lg mb-8 text-left">
            <h3 className="text-xs uppercase tracking-[0.3em] text-[#C8A050] mb-3">How to Play</h3>
            <div className="space-y-3 text-sm text-gray-400">
              <p>The suspect is hiding <span className="text-[#C41E1E] font-bold">one specific lie</span> in their story. Your job is to find it.</p>

              <div className="border-t border-[#2A2A2A] pt-3">
                <p className="text-[#E8E8E8] font-bold text-xs uppercase tracking-wider mb-2">Question</p>
                <p>Tap the <span className="text-[#E8E8E8]">mic button</span> and ask questions with your voice. Watch the <span className="text-[#E8E8E8]">stress meter</span> — it rises when your questions get close to the lie. Look for contradictions in what they say.</p>
              </div>

              <div className="border-t border-[#2A2A2A] pt-3">
                <p className="text-[#C41E1E] font-bold text-xs uppercase tracking-wider mb-2">Accuse</p>
                <p>When you think you know the lie, hit <span className="text-[#C41E1E] font-bold">ACCUSE</span> and say exactly what you think they lied about. Be specific — saying &ldquo;you&rsquo;re lying&rdquo; won&rsquo;t work. You need to say <span className="text-[#E8E8E8]">what</span> they lied about.</p>
                <p className="mt-1">Example: <span className="text-[#E8E8E8] italic">&ldquo;You said you were in the office at 9pm, but the security logs show you left at 7.&rdquo;</span></p>
              </div>

              <div className="border-t border-[#2A2A2A] pt-3">
                <p className="text-[#F59E0B] font-bold text-xs uppercase tracking-wider mb-2">Rules</p>
                <ul className="space-y-1">
                  <li>You have <span className="text-[#E8E8E8]">3 accusations</span>. Use them wisely.</li>
                  <li>You have <span className="text-[#E8E8E8]">10 minutes</span> before the suspect walks.</li>
                  <li>Use <span className="text-[#F59E0B]">hints</span> if you get stuck.</li>
                </ul>
              </div>
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
          className="lg:col-span-2 flex flex-col items-center justify-center p-6 border-r border-[#2A2A2A] relative overflow-hidden"
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
              <div className="mb-4">
                <SuspectAvatar name={caseData.suspect_name} stressLevel={stressLevel} speaking={isSpeaking} />
              </div>

              {/* Waveform — under portrait when speaking */}
              <div className="h-8 flex items-center justify-center mb-3">
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

              {/* Dialogue box — below portrait */}
              <div
                className="w-full max-w-xl border border-[#3A3A4A] rounded-sm p-4"
                style={{ background: 'rgba(10, 12, 18, 0.88)' }}
              >
                <h3 className="text-[#C8A050] font-bold text-sm mb-2 tracking-wide">
                  {caseData.suspect_name}
                </h3>

                {lastResponse ? (
                  <p className="text-[#B8B8C8] text-sm leading-relaxed">
                    {lastResponse}
                  </p>
                ) : phase === 'processing' ? (
                  <div className="flex items-center gap-2">
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
          )}
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
                        <p className="text-sm text-gray-300">{trigger}</p>
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
      <div className="p-4 border-t border-[#2A2A2A] flex items-center justify-between gap-4">
        {/* Left — Exit + Hint */}
        <div className="flex flex-col gap-2 min-w-[100px]">
          <button
            onClick={() => {
              if (timerRef.current) clearInterval(timerRef.current);
              if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
              speechSynthesis.cancel();
              router.push('/cases');
            }}
            className="px-3 py-1.5 text-xs uppercase tracking-wider text-gray-500 hover:text-[#E8E8E8] border border-[#2A2A2A] hover:border-[#C41E1E] rounded-sm transition-colors"
          >
            Exit
          </button>
          <button
            onClick={() => {
              if (caseData && hintsUsed < caseData.stress_triggers.length) {
                setHintsUsed((prev) => prev + 1);
              }
            }}
            disabled={!caseData || hintsUsed >= (caseData?.stress_triggers?.length ?? 0)}
            className={`px-3 py-1.5 text-xs uppercase tracking-wider rounded-sm border transition-colors ${
              !caseData || hintsUsed >= (caseData?.stress_triggers?.length ?? 0)
                ? 'text-gray-600 border-[#1A1A1A] cursor-not-allowed'
                : 'text-[#F59E0B] border-[#2A2A2A] hover:border-[#F59E0B] hover:text-[#E8E8E8]'
            }`}
          >
            Hint {hintsUsed}/{caseData?.stress_triggers?.length ?? 0}
          </button>
        </div>

        {/* Center — Mic + status */}
        <div className="flex flex-col items-center">
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={phase === 'processing' || isSpeaking || isAccusing}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
              isListening && !isAccusing
                ? 'bg-[#C41E1E] scale-110 shadow-[0_0_30px_rgba(196,30,30,0.5)]'
                : phase === 'processing' || isSpeaking || isAccusing
                  ? 'bg-[#2A2A2A] opacity-50 cursor-not-allowed'
                  : 'bg-[#2A2A2A] hover:bg-[#3A3A3A] hover:scale-105'
            }`}
          >
            {isListening && !isAccusing ? (
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

          <p className="mt-2 text-xs uppercase tracking-wider text-gray-500">
            {isAccusing && isListening
              ? 'State your accusation...'
              : isListening
                ? 'Listening...'
                : isSpeaking
                  ? 'Suspect speaking...'
                  : phase === 'processing'
                    ? isAccusing ? 'Evaluating accusation...' : 'Processing...'
                    : 'Tap to ask'}
          </p>

          {lastTranscript && !isListening && (
            <p className="mt-1 text-xs text-gray-600">
              You said: &ldquo;{lastTranscript}&rdquo;
            </p>
          )}
        </div>

        {/* Right — ACCUSE button */}
        <div className="flex flex-col items-end min-w-[100px]">
          <button
            onClick={startAccusation}
            disabled={phase === 'processing' || isSpeaking || isAccusing || accusationsLeft <= 0}
            className={`px-4 py-3 text-sm font-bold uppercase tracking-wider rounded-sm border-2 transition-all ${
              accusationsLeft <= 0
                ? 'text-gray-600 border-[#1A1A1A] cursor-not-allowed'
                : isAccusing
                  ? 'text-white bg-[#C41E1E] border-[#C41E1E] animate-pulse'
                  : 'text-[#C41E1E] border-[#C41E1E] hover:bg-[#C41E1E] hover:text-white'
            }`}
          >
            {isAccusing ? 'Accusing...' : 'Accuse'}
          </button>
          <p className="mt-1 text-xs text-gray-600">
            {accusationsLeft} attempt{accusationsLeft !== 1 ? 's' : ''} left
          </p>
        </div>
      </div>
    </div>
  );
}
