import { motion, fadeDown, snappy } from '../../components/motion';

export function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

interface TopBarProps {
  timer: number;
  stressLevel: number;
  musicVolume: number;
  onMusicToggle: () => void;
}

export default function TopBar({ timer, stressLevel, musicVolume, onMusicToggle }: TopBarProps) {
  const muted = musicVolume === 0;
  return (
    <motion.div
      className="p-3 border-b border-surface-darker flex-shrink-0"
      initial="hidden"
      animate="visible"
      variants={fadeDown}
      transition={snappy}
    >
      <div className="flex items-center gap-6">
        <div className="text-4xl font-bold tabular-nums">
          {formatTime(timer)}
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
        <button
          onClick={() => { try { const m = (() => { try { const s = localStorage.getItem('appSettings'); if (s) return JSON.parse(s).sfxVolume ?? 0.5; } catch {} return 0.5; })(); if (m > 0) { const a = new Audio('/efx/click.wav'); a.volume = 0.25 * m; a.play().catch(() => {}); } } catch {} onMusicToggle(); }}
          className="text-gray-500 hover:text-foreground transition-colors"
          title={muted ? 'Unmute music' : 'Mute music'}
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
      </div>
    </motion.div>
  );
}
