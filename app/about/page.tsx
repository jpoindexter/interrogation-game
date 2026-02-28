'use client';

import { useRouter } from 'next/navigation';
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
  const router = useRouter();

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
                { name: 'INTERROGATION', year: '2026', desc: 'Voice-based AI red-teaming game. Mistral Large 3 plays a lying suspect. You catch the lie. Built in 48 hours.' },
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

          {/* About the Game */}
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
              About INTERROGATION
            </motion.h2>
            <motion.div
              className="bg-surface-darker border border-surface-dark rounded-sm p-6 space-y-4"
              variants={fadeUp}
              transition={smooth}
            >
              <p className="text-sm text-gray-400 leading-relaxed">
                INTERROGATION is an AI red-teaming experiment disguised as a detective noir game.
                The suspect is powered by Mistral Large 3, instructed to maintain a cover story with one hidden lie.
                Your job is to find the contradiction through voice or text-based questioning.
              </p>
              <p className="text-sm text-gray-400 leading-relaxed">
                Every case is procedurally generated &mdash; unique crime, suspect, cover story, and lie.
                The AI never confesses. You win by making a specific accusation that a separate AI judge evaluates.
              </p>
              <div className="border-t border-surface-dark pt-4 mt-4">
                <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-3">Software Used</h4>
                <motion.div
                  className="flex flex-wrap gap-2"
                  variants={stagger(0.04)}
                  initial="hidden"
                  animate="visible"
                >
                  {[
                    { name: 'Mistral Large 3', href: 'https://mistral.ai', desc: 'Suspect AI brain' },
                    { name: 'Voxtral STT', href: 'https://mistral.ai', desc: 'Speech-to-text' },
                    { name: 'ElevenLabs', href: 'https://elevenlabs.io', desc: 'Voice synthesis' },
                    { name: 'Claude', href: 'https://claude.ai', desc: 'AI coding assistant' },
                    { name: 'Sora', href: 'https://openai.com/sora', desc: 'Video generation' },
                    { name: 'PixelLab', href: 'https://www.pixellab.ai', desc: 'Pixel art generation' },
                    { name: 'Next.js 16', href: 'https://nextjs.org', desc: 'React framework' },
                    { name: 'TypeScript', href: 'https://www.typescriptlang.org', desc: 'Type safety' },
                    { name: 'Tailwind v4', href: 'https://tailwindcss.com', desc: 'CSS framework' },
                  ].map((tech) => (
                    <motion.a
                      key={tech.name}
                      href={tech.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] uppercase tracking-wider text-gray-500 hover:text-foreground px-2 py-1 border border-surface hover:border-accent rounded-sm transition-colors"
                      title={tech.desc}
                      variants={fadeUp}
                      transition={snappy}
                    >
                      {tech.name}
                    </motion.a>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          </motion.div>

          {/* Actions */}
          <motion.div
            className="flex gap-4 justify-center"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ ...smooth, delay: 0.3 }}
          >
            <motion.button
              onClick={() => router.push('/cases')}
              className="px-8 py-4 bg-accent text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              transition={snappy}
            >
              PLAY
            </motion.button>
            <motion.button
              onClick={() => router.push('/')}
              className="px-8 py-4 bg-surface text-white font-bold rounded-lg hover:bg-surface-hover transition-colors"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              transition={snappy}
            >
              BACK
            </motion.button>
          </motion.div>
        </div>
      </PageMotion>
    </PageShell>
  );
}
