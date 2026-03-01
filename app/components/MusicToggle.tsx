'use client';

import { usePathname } from 'next/navigation';
import { useMusicPlayer } from '../hooks/useMusicPlayer';
import { playClick } from '../lib/sfx-utils';

export default function MusicToggle() {
  const pathname = usePathname();
  const isGame = pathname.startsWith('/game');
  const { muted, ready, gameActive, toggle } = useMusicPlayer(isGame);

  if (!ready || (isGame && gameActive)) return null;

  return (
    <button
      onClick={() => { playClick(); toggle(); }}
      className="fixed bottom-4 right-4 z-50 w-10 h-10 flex items-center justify-center bg-surface-darker/80 hover:bg-surface-dark border border-surface rounded-full transition-colors backdrop-blur-sm"
      title={muted ? 'Play music' : 'Mute music'}
    >
      {muted ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground">
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      )}
    </button>
  );
}
