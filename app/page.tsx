'use client';

import HomeNavigation from './components/HomeNavigation';
import AssetImage from './components/AssetImage';
import { useProviderReadiness } from './settings/useProviderReadiness';
import Link from 'next/link';
import {
  motion,
  PageMotion,
  fadeIn,
  fadeUp,
  scaleIn,
  gentle,
  smooth,
} from './components/motion';
import { playClick } from './lib/sfx-utils';

export default function HomePage() {
  const readiness = useProviderReadiness();

  return (
    <PageMotion>
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 pt-24 pb-10 font-mono bg-black relative overflow-hidden"
      >
        {/* Animated pixel particles */}
        <RainEffect />

        <HomeNavigation />

        {/* Subtle scanlines over everything */}
        <div
          className="fixed inset-0 pointer-events-none z-30 opacity-[0.03]"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
          }}
        />

        {/* Hero image — title baked in */}
        <TitleArtwork />

        <MainMenu />
        <ConfigurationBadge readiness={readiness} />
        <footer className="relative z-10 mt-12 text-center text-xs text-gray-400">
          <Link href="/about-game" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-foreground">
            From hackathon prototype to local demo
          </Link>
        </footer>
      </div>
    </PageMotion>
  );
}


function RainEffect() {
  return (
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
  );
}


function ConfigurationBadge({ readiness }: { readiness: ReturnType<typeof useProviderReadiness> }) {
  const { value, error } = readiness;
  let label = 'Checking demo setup…';
  if (error) label = 'Setup status unavailable';
  if (value) label = value.services.ai.configured ? 'AI settings found' : 'AI setup needed';
  return (
    <motion.div className="relative z-10 mt-5 max-w-sm text-center text-xs text-gray-400"
      variants={fadeIn} initial="hidden" animate="visible" transition={{ ...smooth, delay: 0.6 }}>
      <p role="status">{value?.mode === 'local' ? 'Local demo · ' : ''}{label}</p>
      <Link href="/settings" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-foreground">
        Review AI and voice setup
      </Link>
    </motion.div>
  );
}

function TitleArtwork() {
  return (
<motion.div
          className="relative -mb-24 z-10"
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          transition={gentle}
        >
          <AssetImage
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
  );
}


function MainMenu() {
  return (
    <motion.nav aria-label="Start playing"
      className="relative z-10 flex flex-col items-center gap-3 text-center"
      variants={fadeUp} initial="hidden" animate="visible"
      transition={{ ...smooth, delay: 0.3 }}>
      <h1 className="sr-only">Interrogation</h1>
      <p className="max-w-sm text-sm text-gray-300">Question the suspect. Compare the evidence. Find the contradiction.</p>
      <Link href="/cases" onClick={() => playClick()}
        className="inline-flex min-h-11 items-center px-8 py-3 bg-accent hover:bg-accent-hover text-white text-sm font-bold uppercase tracking-wider rounded-sm transition-colors">
        Choose a case
      </Link>
      <Link href="/rehearsal" onClick={() => playClick()}
        className="inline-flex min-h-11 flex-col justify-center px-4 py-2 text-sm text-gray-200 hover:text-white underline underline-offset-4">
        Recorded walkthrough
      </Link>
      <p className="-mt-3 text-xs text-gray-400">A saved example. No live AI or setup needed.</p>
    </motion.nav>
  );
}
