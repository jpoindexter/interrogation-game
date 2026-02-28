'use client';

import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 font-mono bg-[#0A0A0A] relative overflow-hidden"
    >
      {/* Animated pixel particles */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-[#C41E1E]"
            style={{
              width: '2px',
              height: '2px',
              left: `${8 + (i * 47) % 90}%`,
              top: `${5 + (i * 31) % 88}%`,
              opacity: 0.15 + (i % 4) * 0.05,
              animation: `pixelFloat ${3 + (i % 3)}s ease-in-out ${(i * 0.4) % 3}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Subtle scanlines over everything */}
      <div
        className="fixed inset-0 pointer-events-none z-30 opacity-[0.03]"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
        }}
      />

      {/* Title with blinking cursor */}
      <h1
        className="text-5xl md:text-7xl font-bold text-white text-center mb-8 tracking-wider relative z-10 cursor"
      >
        INTERROGATION
      </h1>

      {/* Pixel art scene with effects */}
      <div className="relative mb-8 z-10">
        <img
          src="/bg/police.png"
          alt="Interrogation room"
          className="w-[500px] md:w-[640px] max-w-full rounded-sm border border-[#2A2A2A]"
          style={{
            imageRendering: 'pixelated',
            animation: 'flicker 4s infinite',
          }}
        />
        {/* Scanlines on image */}
        <div
          className="absolute inset-0 pointer-events-none rounded-sm opacity-20"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.4) 2px, rgba(0,0,0,0.4) 4px)',
          }}
        />
        {/* CRT vignette on image */}
        <div
          className="absolute inset-0 pointer-events-none rounded-sm"
          style={{
            boxShadow: 'inset 0 0 60px rgba(0,0,0,0.6), inset 0 0 120px rgba(0,0,0,0.3)',
          }}
        />
        {/* REC indicator */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <span className="w-[6px] h-[6px] bg-[#C41E1E] animate-pulse" />
          <span className="text-[10px] text-[#C41E1E]/60 uppercase tracking-wider">Rec</span>
        </div>
        {/* Flicker line — horizontal scan */}
        <div
          className="absolute left-0 right-0 h-[1px] pointer-events-none opacity-10"
          style={{
            background: 'rgba(255,255,255,0.6)',
            animation: 'scanDrift 4s linear infinite',
          }}
        />
      </div>

      {/* Menu */}
      <div className="flex flex-col items-center gap-4 mb-8 z-10">
        <button
          onClick={() => router.push('/cases')}
          className="text-sm text-[#C41E1E] hover:text-[#ff4444] uppercase tracking-wider transition-colors"
        >
          &gt; Start New Case
        </button>
        <button
          onClick={() => router.push('/leaderboard')}
          className="text-sm text-[#C8A050] hover:text-[#ffcc55] uppercase tracking-wider transition-colors"
        >
          &gt; Leaderboard
        </button>
        <button
          onClick={() => router.push('/help')}
          className="text-sm text-gray-500 hover:text-gray-300 uppercase tracking-wider transition-colors"
        >
          &gt; How to Play
        </button>
      </div>

      {/* System status line */}
      <div className="flex items-center gap-2 mb-6 z-10">
        <span className="w-[6px] h-[6px] bg-green-500 animate-pulse" />
        <span className="text-[10px] text-gray-500 uppercase tracking-widest">
          System Online &bull; Mistral AI Core Active
        </span>
      </div>

      {/* Logos */}
      <div className="flex items-center gap-6 mb-4 z-10">
        <img
          src="/ui/mistral-logo.png"
          alt="Mistral AI"
          className="h-5 opacity-40"
        />
        <img
          src="/ui/infinity.webp"
          alt="Infinity"
          className="h-6 opacity-40"
        />
      </div>

      {/* Footer */}
      <p className="text-xs text-gray-600 uppercase tracking-wider z-10">
        Powered by Mistral AI &bull; Hackathon 2026
      </p>
    </div>
  );
}
