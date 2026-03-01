'use client';

import { useRouter } from 'next/navigation';
import {
  motion,
  PageMotion,
  fadeIn,
  fadeUp,
  fadeDown,
  scaleIn,
  stagger,
  gentle,
  smooth,
  snappy,
} from './components/motion';
import { playClick } from './lib/sfx-utils';

export default function HomePage() {
  const router = useRouter();

  return (
    <PageMotion>
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 pb-32 font-mono bg-black relative overflow-hidden"
      >
        {/* Animated pixel particles */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-accent"
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
        <motion.div
          className="absolute top-6 left-6 z-20 flex items-center gap-2"
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          transition={{ ...smooth, delay: 0.6 }}
        >
          <span className="w-[6px] h-[6px] bg-green-500 animate-pulse" />
          <span className="text-[10px] text-gray-500 uppercase tracking-widest">
            System Online &bull; Mistral AI &bull; ElevenLabs
          </span>
        </motion.div>

        {/* Top-right nav icons */}
        <motion.div
          className="absolute top-6 right-6 z-20 flex items-center gap-4"
          variants={stagger(0.06)}
          initial="hidden"
          animate="visible"
        >
          {/* Leaderboard — trophy */}
          <motion.button
            onClick={() => { playClick(); router.push('/leaderboard'); }}
            className="text-gray-500 hover:text-gold transition-colors"
            data-tooltip="Leaderboard"
            variants={fadeDown}
            transition={snappy}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
          </motion.button>
          {/* Help — question mark */}
          <motion.button
            onClick={() => { playClick(); router.push('/help'); }}
            className="text-gray-500 hover:text-white transition-colors"
            data-tooltip="How to Play"
            variants={fadeDown}
            transition={snappy}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </motion.button>
          {/* About Game — brain/circuit */}
          <motion.button
            onClick={() => { playClick(); router.push('/about-game'); }}
            className="text-gray-500 hover:text-white transition-colors"
            data-tooltip="About the Game"
            variants={fadeDown}
            transition={snappy}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.3 6H8.3C6.3 13.7 5 11.5 5 9a7 7 0 0 1 7-7z" />
              <path d="M9 22h6" /><path d="M9 18h6" /><path d="M10 18v4" /><path d="M14 18v4" />
            </svg>
          </motion.button>
          {/* About Developer — user */}
          <motion.button
            onClick={() => { playClick(); router.push('/about'); }}
            className="text-gray-500 hover:text-white transition-colors"
            data-tooltip="Developer"
            variants={fadeDown}
            transition={snappy}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </motion.button>
          {/* Settings — gear */}
          <motion.button
            onClick={() => { playClick(); router.push('/settings'); }}
            className="text-gray-500 hover:text-white transition-colors"
            data-tooltip="Settings"
            variants={fadeDown}
            transition={snappy}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </motion.button>
        </motion.div>

        {/* Subtle scanlines over everything */}
        <div
          className="fixed inset-0 pointer-events-none z-30 opacity-[0.03]"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
          }}
        />

        {/* Hero image — title baked in */}
        <motion.div
          className="relative -mb-24 z-10"
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          transition={gentle}
        >
          <img
            src="/logo/main3.png"
            alt="INTERROGATION"
            className="w-[600px] md:w-[780px] max-w-full"
            style={{
              imageRendering: 'pixelated',
              animation: 'flicker 4s infinite',
              filter: 'saturate(0.3) sepia(0.15) contrast(1.1) brightness(0.95)',
            }}
          />
          {/* Scanlines overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.4) 2px, rgba(0,0,0,0.4) 4px)',
            }}
          />
          {/* Interference flicker — random opacity jitter */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              animation: 'interference 0.15s steps(2) infinite',
              background: 'rgba(255,255,255,0.01)',
            }}
          />
        </motion.div>

        {/* Primary CTA */}
        <motion.div
          className="flex flex-col items-center gap-3 z-10"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ ...smooth, delay: 0.3 }}
        >
          <motion.button
            onClick={() => { playClick(); router.push('/cases'); }}
            className="px-8 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-colors"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            transition={snappy}
          >
            Start New Case
          </motion.button>
        </motion.div>

        {/* Sponsors + footer — pinned to bottom */}
        <div className="absolute bottom-12 left-0 right-0 z-10 flex flex-col items-center gap-5 px-6">
          <motion.div
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 max-w-3xl"
            variants={stagger(0.05)}
            initial="hidden"
            animate="visible"
          >
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
              <motion.a
                key={logo.alt}
                href={logo.href}
                target="_blank"
                rel="noopener noreferrer"
                variants={fadeUp}
                transition={snappy}
              >
                <img
                  src={logo.src}
                  alt={logo.alt}
                  className="h-5 opacity-30 hover:opacity-50 transition-opacity"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
              </motion.a>
            ))}
          </motion.div>
          <motion.p
            className="text-xs text-gray-600 uppercase tracking-wider"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            transition={{ ...smooth, delay: 0.8 }}
          >
            Mistral Worldwide Hackathon &bull; 2026
          </motion.p>
        </div>
      </div>
    </PageMotion>
  );
}
