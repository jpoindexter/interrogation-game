'use client';

import { BackButton, PageShell, PageHeader } from '../components/ui';
import {
  motion,
  PageMotion,
  fadeIn,
  fadeUp,
  stagger,
  smooth,
  snappy,
} from '../components/motion';

export default function AboutPage() {
  return (
    <PageShell>
      <PageMotion>
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          transition={{ ...smooth, delay: 0.1 }}
        >
          <BackButton />
        </motion.div>
        <div className="max-w-3xl mx-auto px-6 py-12">
          <motion.div
            className="mb-12"
            variants={stagger(0.1)}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={fadeUp} transition={smooth}>
              <PageHeader label="Solo Build" title="ABOUT" />
            </motion.div>
            <motion.p
              className="text-sm text-gray-500 -mt-8"
              variants={fadeUp}
              transition={smooth}
            >
              Mistral Worldwide Hackathon 2026 &bull; Online Track
            </motion.p>
          </motion.div>

          {/* Builder */}
          <motion.div
            className="mb-12"
            variants={stagger(0.08)}
            initial="hidden"
            animate="visible"
          >
            <motion.h2
              className="text-xs uppercase tracking-[0.3em] text-gold mb-6"
              variants={fadeUp}
              transition={smooth}
            >
              The Builder
            </motion.h2>
            <motion.div
              className="bg-surface-darker border border-surface-dark rounded-sm p-6"
              variants={fadeUp}
              transition={smooth}
            >
              <h3 className="text-xl font-bold mb-1">Jason Poindexter</h3>
              <p className="text-sm text-gray-400 mb-4">UX Designer &bull; AI Systems Builder &bull; Barcelona, ES</p>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                UX designer for 15+ years, now building AI-native systems. Shipped products at
                Apple, Google, YouTube, FedEx Digital, London Stock Exchange, Electronic Arts, Equinix, and more.
                Currently building Gripe (AI-powered market intelligence) and Kern (design system enforcement).
              </p>
              <p className="text-sm text-gray-400 leading-relaxed">
                Focus areas: agentic AI platforms, human-AI workflow systems, enterprise product architecture,
                and zero-to-one builds in compliance-sensitive environments.
              </p>
            </motion.div>
          </motion.div>

          {/* Experience highlights */}
          <motion.div
            className="mb-12"
            variants={stagger(0.08)}
            initial="hidden"
            animate="visible"
          >
            <motion.h2
              className="text-xs uppercase tracking-[0.3em] text-gold mb-6"
              variants={fadeUp}
              transition={smooth}
            >
              Selected Work
            </motion.h2>
            <motion.div
              className="space-y-3"
              variants={stagger(0.06)}
            >
              {[
                { role: 'Director of Product & Design', company: 'THEFT Studio', desc: 'AI product builds for London Stock Exchange, FedEx Digital, YouTube, Google Health, Waymo, Booking.com.' },
                { role: 'Lead Product Designer', company: 'Apple', desc: 'Internal experimentation platform adopted across Apple, saving $5M+ annually.' },
                { role: 'UX Design Team Lead', company: 'Electronic Arts', desc: 'Product strategy and redesign for pogo.com ($30M+ annual revenue).' },
                { role: 'Principal Product Designer', company: 'Equinix', desc: 'Enterprise SaaS modernization. Launched SmartView product offering.' },
                { role: 'Senior UX Designer', company: 'FedEx Digital', desc: 'Redesigned FedEx logistics tracking. Shipped to millions of daily active users.' },
              ].map((item) => (
                <motion.div
                  key={item.company}
                  className="bg-surface-darker border border-surface-dark rounded-sm p-4"
                  variants={fadeUp}
                  transition={snappy}
                >
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm font-bold text-gray-300">{item.role}</span>
                    <span className="text-xs text-accent">{item.company}</span>
                  </div>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* AI Systems Launched */}
          <motion.div
            className="mb-12"
            variants={stagger(0.08)}
            initial="hidden"
            animate="visible"
          >
            <motion.h2
              className="text-xs uppercase tracking-[0.3em] text-gold mb-6"
              variants={fadeUp}
              transition={smooth}
            >
              AI Systems Launched
            </motion.h2>
            <motion.div
              className="space-y-3"
              variants={stagger(0.06)}
            >
              {[
                { name: 'Gripe', year: '2026', desc: 'AI-powered market intelligence. Turns fragmented public signals into structured acquisition and competitive analysis. Multi-agent pipeline with scoring models.' },
                { name: 'Kern', year: '2026', desc: 'Design system enforcement engine. Scans production codebases for consistency violations and generates actionable fix reports with auto-patching.' },
                { name: 'AgentSmith', year: '2026', desc: 'Automated codebase audit engine. Generates maintainability scoring and structured technical due-diligence reports from live repositories.' },
                { name: 'Fabrk', year: '2025', desc: 'AI agent framework. Modular pipeline for building, chaining, and deploying conversational AI agents with structured tool orchestration.' },
              ].map((item) => (
                <motion.div
                  key={item.name}
                  className="bg-surface-darker border border-surface-dark rounded-sm p-4"
                  variants={fadeUp}
                  transition={snappy}
                >
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm font-bold text-gray-300">{item.name}</span>
                    <span className="text-[10px] text-gray-600">{item.year}</span>
                  </div>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Tools & Credits */}
          <motion.div
            className="mb-12"
            variants={stagger(0.08)}
            initial="hidden"
            animate="visible"
          >
            <motion.h2
              className="text-xs uppercase tracking-[0.3em] text-gold mb-6"
              variants={fadeUp}
              transition={smooth}
            >
              Tools &amp; Credits
            </motion.h2>
            <motion.div
              className="space-y-3"
              variants={stagger(0.06)}
            >
              {[
                { name: 'Mistral AI', url: 'https://mistral.ai', desc: 'Large language model powering case generation, suspect AI, accusation evaluation, and Voxtral speech-to-text.' },
                { name: 'ElevenLabs', url: 'https://elevenlabs.io', desc: 'Text-to-speech voice synthesis with dynamic stress-based stability for suspect and detective voices.' },
                { name: 'PixelLab', url: 'https://pixellab.ai', desc: 'AI-generated pixel art suspect portraits and character assets.' },
                { name: 'Suno', url: 'https://suno.com', desc: 'AI-generated background music tracks for menu and in-game atmosphere.' },
                { name: 'Pixabay', url: 'https://pixabay.com', desc: 'Royalty-free sound effects used throughout the game.' },
                { name: 'OpenAI Sora', url: 'https://openai.com/sora', desc: 'AI image generation for game artwork and visual assets.' },
                { name: 'FFmpeg', url: 'https://ffmpeg.org', desc: 'Open-source audio/video processing used to trim and optimize all game sound effects.' },
              ].map((item) => (
                <motion.a
                  key={item.name}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-surface-darker border border-surface-dark rounded-sm p-4 hover:border-surface transition-colors"
                  variants={fadeUp}
                  transition={snappy}
                >
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm font-bold text-gray-300">{item.name}</span>
                    <span className="text-[10px] text-accent">&#x2197;</span>
                  </div>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </motion.a>
              ))}
            </motion.div>
          </motion.div>

          {/* Social links */}
          <motion.div
            className="flex gap-4 justify-center"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ ...smooth, delay: 0.3 }}
          >
            <motion.a
              href="https://www.linkedin.com/in/jasonmpoindexter/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-3 bg-surface text-gray-300 hover:text-white text-xs uppercase tracking-wider rounded-sm border border-surface-dark hover:border-accent transition-colors"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              transition={snappy}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              LinkedIn
            </motion.a>
            <motion.a
              href="https://github.com/jpoindexter"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-3 bg-surface text-gray-300 hover:text-white text-xs uppercase tracking-wider rounded-sm border border-surface-dark hover:border-accent transition-colors"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              transition={snappy}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
              GitHub
            </motion.a>
          </motion.div>
        </div>
      </PageMotion>
    </PageShell>
  );
}
