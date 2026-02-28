'use client';

import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 font-mono bg-black relative overflow-hidden"
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

      {/* System status — top left */}
      <div className="absolute top-6 left-6 z-20 flex items-center gap-2">
        <span className="w-[6px] h-[6px] bg-green-500 animate-pulse" />
        <span className="text-[10px] text-gray-500 uppercase tracking-widest">
          System Online &bull; Mistral AI &bull; ElevenLabs
        </span>
      </div>

      {/* Top-right nav icons */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-4">
        {/* Leaderboard — trophy */}
        <button
          onClick={() => router.push('/leaderboard')}
          className="text-gray-500 hover:text-[#C8A050] transition-colors"
          title="Leaderboard"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
        </button>
        {/* Help — question mark */}
        <button
          onClick={() => router.push('/help')}
          className="text-gray-500 hover:text-white transition-colors"
          title="How to Play"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>
        {/* About — user */}
        <button
          onClick={() => router.push('/about')}
          className="text-gray-500 hover:text-white transition-colors"
          title="About"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </button>
        {/* Settings — gear */}
        <button
          onClick={() => router.push('/settings')}
          className="text-gray-500 hover:text-white transition-colors"
          title="Settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Subtle scanlines over everything */}
      <div
        className="fixed inset-0 pointer-events-none z-30 opacity-[0.03]"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
        }}
      />

      {/* Hero image — title baked in */}
      <div className="relative -mb-6 z-10">
        <img
          src="/logo/main3.png"
          alt="INTERROGATION"
          className="w-[500px] md:w-[640px] max-w-full"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Primary CTA */}
      <div className="flex flex-col items-center gap-3 mb-6 z-10">
        <button
          onClick={() => router.push('/cases')}
          className="px-10 py-3 bg-[#C41E1E] hover:bg-[#ff4444] text-white text-sm font-bold uppercase tracking-[0.2em] rounded-sm transition-colors"
        >
          Start New Case
        </button>
      </div>

      {/* Sponsors */}
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 max-w-3xl px-6 mb-3 z-10">
        {[
          { src: '/sponsors/mistral.webp', alt: 'Mistral AI', href: 'https://mistral.ai' },
          { src: '/sponsors/11labs.webp', alt: 'ElevenLabs', href: 'https://elevenlabs.io' },
          { src: '/sponsors/nvidia.webp', alt: 'NVIDIA', href: 'https://nvidia.com' },
          { src: '/sponsors/aws.webp', alt: 'AWS', href: 'https://aws.amazon.com' },
          { src: '/sponsors/huggingface.webp', alt: 'Hugging Face', href: 'https://huggingface.co' },
          { src: '/sponsors/jumptrading.webp', alt: 'Jump Trading', href: 'https://jumptrading.com' },
          { src: '/sponsors/codeweavers.webp', alt: 'Weights & Biases', href: 'https://wandb.ai' },
          { src: '/sponsors/giant.webp', alt: 'Giant', href: 'https://giant.vc' },
          { src: '/sponsors/raise.webp', alt: 'Raise', href: 'https://raise.dev' },
          { src: '/sponsors/tilde.webp', alt: 'Tilde Research', href: 'https://tilderesearch.com' },
          { src: '/sponsors/white.webp', alt: 'White Circle', href: 'https://whitecircle.ai' },
        ].map((logo) => (
          <a key={logo.alt} href={logo.href} target="_blank" rel="noopener noreferrer">
            <img
              src={logo.src}
              alt={logo.alt}
              className="h-5 opacity-30 hover:opacity-50 transition-opacity"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </a>
        ))}
      </div>

      {/* Footer */}
      <p className="text-xs text-gray-600 uppercase tracking-wider z-10">
        Mistral Worldwide Hackathon &bull; 2026
      </p>
    </div>
  );
}
