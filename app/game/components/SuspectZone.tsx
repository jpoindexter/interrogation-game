import type { Case } from '@/lib/game-state';
import SuspectAvatar from '../SuspectAvatar';
import { getSceneBg } from './utils';

interface SuspectZoneProps {
  caseData: Case;
  stressLevel: number;
  isSpeaking: boolean;
  isListening: boolean;
  lastTranscript: string;
  lastResponse: string;
  phase: string;
}

export default function SuspectZone({
  caseData,
  stressLevel,
  isSpeaking,
  isListening,
  lastTranscript,
  lastResponse,
  phase,
}: SuspectZoneProps) {
  return (
    <div
      className="lg:col-span-2 flex flex-col items-center justify-center p-4 border-r border-[#2A2A2A] relative overflow-hidden"
      style={{
        backgroundImage: `url(${getSceneBg(caseData.setting)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        imageRendering: 'pixelated',
      }}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 flex flex-col items-center w-full">
        <div className="mb-2">
          <SuspectAvatar
            name={caseData.suspect_name}
            gender={caseData.suspect_gender}
            stressLevel={stressLevel}
            size="md"
            speaking={isSpeaking}
          />
        </div>

        {/* Waveform */}
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

        {/* Dialogue */}
        <div
          className="w-full max-w-xl border border-[#3A3A4A] rounded-sm p-4 space-y-3"
          style={{ background: 'rgba(10, 12, 18, 0.88)', minHeight: '120px' }}
        >
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
    </div>
  );
}
