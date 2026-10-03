import { motion, fadeDown, snappy } from '../../components/motion';
import { playClick } from '../../lib/sfx-utils';
import { formatTime } from './utils';

interface TopBarProps {
  remaining: number;
  elapsed?: number;
  timeLimit: number;
  isUnlimited?: boolean;
  stressLevel: number;
  audioMuted: boolean;
  onAudioToggle: () => void;
}

export default function TopBar({ remaining, elapsed, isUnlimited, stressLevel, audioMuted, onAudioToggle }: TopBarProps) {
  const muted = audioMuted;
  const urgent = !isUnlimited && remaining <= 60;
  const warning = !isUnlimited && remaining <= 120 && !urgent;
  return (
    <motion.div
      className="p-3 border-b border-surface-darker flex-shrink-0"
      initial="hidden"
      animate="visible"
      variants={fadeDown}
      transition={snappy}
    >
      <GameStatusBar urgent={urgent} warning={warning} isUnlimited={isUnlimited} elapsed={elapsed} remaining={remaining} stressLevel={stressLevel} onAudioToggle={onAudioToggle} muted={muted} />
    </motion.div>
  );
}


function GameStatusBar({ urgent, warning, isUnlimited, elapsed, remaining, stressLevel, onAudioToggle, muted }: { urgent: boolean; warning: boolean; isUnlimited: boolean | undefined; elapsed: number | undefined; remaining: number; stressLevel: number; onAudioToggle: () => void; muted: boolean }) {
  return (
<div className="flex items-center gap-3 sm:gap-6">
        <div className={`text-4xl font-bold tabular-nums ${urgent ? 'text-accent animate-pulse' : warning ? 'text-warn' : ''}`}>
          {isUnlimited ? formatTime(elapsed ?? 0) : formatTime(remaining)}
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-xs uppercase tracking-wider mb-1">
            <span className="text-gray-500">Stress Level</span>
            <span className={stressLevel > 6 ? 'text-accent' : 'text-gray-400'}>
              {stressLevel}/10
            </span>
          </div>
          <div className="h-3 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${(stressLevel / 10) * 100}%`,
                backgroundColor:
                  stressLevel <= 3 ? 'var(--foreground)' : stressLevel <= 6 ? 'var(--warn)' : 'var(--accent)',
              }}
            />
          </div>
        </div>
        <AudioToggle muted={muted} onToggle={onAudioToggle} />
      </div>
  );
}

function AudioToggle({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
        <button
          onClick={() => { playClick(); onToggle(); }}
          className="min-h-11 min-w-11 text-gray-300 hover:text-foreground transition-colors"
          title={muted ? 'Unmute all audio' : 'Mute all audio'}
          aria-label={muted ? 'Unmute all audio' : 'Mute all audio'}
          aria-pressed={muted}
        >
          {muted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>
  );
}
