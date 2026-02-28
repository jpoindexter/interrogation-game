import type { Case } from '@/lib/game-state';
import SuspectAvatar from '../SuspectAvatar';
import VoiceWaveform from './VoiceWaveform';
import { getSceneBg } from './utils';
import { motion, fadeIn, scaleIn, smooth, snappy } from '../../components/motion';

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
    <motion.div
      className="lg:col-span-2 flex flex-col items-center justify-center p-4 border-r border-surface relative overflow-hidden"
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      transition={smooth}
      style={{
        backgroundImage: `url(${getSceneBg(caseData.setting)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        imageRendering: 'pixelated',
      }}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 flex flex-col items-center w-full">
        <motion.div
          className="mb-2"
          initial="hidden"
          animate="visible"
          variants={scaleIn}
          transition={snappy}
        >
          <SuspectAvatar
            name={caseData.suspect_name}
            gender={caseData.suspect_gender}
            stressLevel={stressLevel}
            size="md"
            speaking={isSpeaking}
          />
        </motion.div>

        {/* Waveform */}
        <div className="w-full max-w-xl mb-2">
          <VoiceWaveform isActive={isSpeaking} stressLevel={stressLevel} />
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
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
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

          <div className="border-t border-surface" />

          <div>
            <span className="text-gold font-bold text-sm">{caseData.suspect_name}</span>
            {lastResponse ? (
              <p className="text-text-secondary text-sm leading-relaxed mt-1">{lastResponse}</p>
            ) : phase === 'processing' ? (
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-warn rounded-full animate-pulse" />
                <span className="text-gray-500 text-sm">...</span>
              </div>
            ) : (
              <p className="text-gray-600 text-sm italic mt-1">Waiting to speak...</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
