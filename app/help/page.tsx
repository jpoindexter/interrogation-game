'use client';

import { useRouter } from 'next/navigation';
import { BackButton, PageShell, PageHeader } from '../components/ui';
import { motion, fadeIn, fadeUp, stagger, smooth, PageMotion } from '../components/motion';

export default function HelpPage() {
  const router = useRouter();

  return (
    <PageShell>
      <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={smooth}>
        <BackButton />
      </motion.div>
      <PageMotion>
        <div className="max-w-3xl mx-auto px-6 py-12">
          <motion.div
            className="mb-12"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={smooth}
          >
            <PageHeader label="Field Manual" title="HOW TO PLAY" />
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger(0.12)}
          >
            {/* Step 1 — Choose a Case */}
            <motion.div className="mb-12" variants={fadeUp} transition={smooth}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-bold text-accent">01</span>
                <h2 className="text-sm font-bold uppercase tracking-wider">Choose a Case</h2>
              </div>
              <p className="text-sm text-gray-400 mb-5 leading-relaxed">
                Pick a location. Each one generates a unique crime, suspect, and hidden lie.
              </p>
              {/* Location thumbnails */}
              <motion.div
                className="grid grid-cols-4 gap-2"
                variants={stagger(0.06)}
                initial="hidden"
                animate="visible"
              >
                {['office', 'trade', 'lawfirm', 'police'].map((loc) => (
                  <motion.div
                    key={loc}
                    className="relative overflow-hidden rounded-sm border border-surface"
                    style={{ aspectRatio: '16 / 10' }}
                    variants={fadeUp}
                    transition={smooth}
                  >
                    <img
                      src={`/bg/${loc}.png`}
                      alt={loc}
                      className="w-full h-full object-cover"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <span className="absolute bottom-1 left-1.5 text-[9px] uppercase tracking-wider text-gray-300">
                      {loc === 'lawfirm' ? 'Law Firm' : loc === 'trade' ? 'Trading' : loc}
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            {/* Step 2 — Interrogate */}
            <motion.div className="mb-12" variants={fadeUp} transition={smooth}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-bold text-accent">02</span>
                <h2 className="text-sm font-bold uppercase tracking-wider">Interrogate the Suspect</h2>
              </div>
              <p className="text-sm text-gray-400 mb-5 leading-relaxed">
                Ask questions using your voice. The suspect will respond &mdash; but they&apos;re hiding something. Faster solves earn higher scores.
              </p>
              {/* Mock interrogation scene */}
              <div className="relative bg-surface-darker border border-surface-dark rounded-sm p-5 flex items-center gap-5">
                {/* Room bg */}
                <div
                  className="absolute inset-0 opacity-15 rounded-sm"
                  style={{
                    backgroundImage: 'url(/bg/police.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    imageRendering: 'pixelated',
                  }}
                />
                {/* Suspect portrait */}
                <div className="relative shrink-0">
                  <img
                    src="/suspects/suspect-03-m.png"
                    alt="Suspect"
                    className="w-20 h-20 rounded-sm border border-surface object-cover"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <div className="absolute -bottom-1 -right-1 bg-accent text-[8px] text-white px-1 py-0.5 uppercase">
                    Suspect
                  </div>
                </div>
                {/* Dialogue mockup */}
                <div className="relative flex-1">
                  <div className="bg-surface-dark border border-surface rounded-sm p-3 mb-2">
                    <p className="text-[11px] text-gray-300 italic">
                      &ldquo;I was at the office until 9pm. You can check the security logs...&rdquo;
                    </p>
                  </div>
                  {/* Stress meter mock */}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-gray-500 uppercase">Stress</span>
                    <div className="flex-1 h-1.5 bg-surface-dark rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-accent to-accent-hover rounded-full" style={{ width: '40%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Step 3 — Find Clues */}
            <motion.div className="mb-12" variants={fadeUp} transition={smooth}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-bold text-accent">03</span>
                <h2 className="text-sm font-bold uppercase tracking-wider">Collect 3 Clues</h2>
              </div>
              <p className="text-sm text-gray-400 mb-5 leading-relaxed">
                Press on suspicious topics. As stress rises, you&apos;ll unlock detective badges. You need all 3 to make an accusation.
              </p>
              {/* Evidence progression */}
              <motion.div
                className="flex items-end justify-center gap-8 bg-surface-darker border border-surface-dark rounded-sm py-6 px-4"
                variants={stagger(0.1)}
                initial="hidden"
                animate="visible"
              >
                {[
                  { src: '/clues/folder.png', label: 'Evidence 1', sub: 'Stress 3+' },
                  { src: '/clues/recorder.png', label: 'Evidence 2', sub: 'Stress 5+' },
                  { src: '/clues/magnifying_glass.png', label: 'Evidence 3', sub: 'Stress 7+' },
                ].map((item, n) => (
                  <motion.div key={n} className="flex flex-col items-center gap-2" variants={fadeUp} transition={smooth}>
                    <img
                      src={item.src}
                      alt={item.label}
                      className="object-contain drop-shadow-lg"
                      style={{
                        imageRendering: 'pixelated',
                        width: `${48 + n * 8}px`,
                        height: `${48 + n * 8}px`,
                      }}
                    />
                    <span className="text-[9px] text-gray-500 uppercase tracking-wider">
                      {item.label}
                    </span>
                    <span className="text-[8px] text-gray-600">
                      {item.sub}
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            {/* Step 4 — Accuse */}
            <motion.div className="mb-12" variants={fadeUp} transition={smooth}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-bold text-accent">04</span>
                <h2 className="text-sm font-bold uppercase tracking-wider">Make Your Accusation</h2>
              </div>
              <p className="text-sm text-gray-400 mb-5 leading-relaxed">
                Once you have all 3 clues, hit ACCUSE and call out the lie. Be specific &mdash; the AI judges your accuracy.
              </p>
              {/* Case closed visual */}
              <div className="flex items-center justify-center bg-surface-darker border border-surface-dark rounded-sm py-8">
                <img
                  src="/solved/case_closed.png"
                  alt="Case Closed"
                  className="w-36 -rotate-6"
                />
              </div>
            </motion.div>

            {/* Tips */}
            <motion.div className="mb-12 bg-surface-darker border border-surface-dark rounded-sm p-6" variants={fadeUp} transition={smooth}>
              <h2 className="text-xs uppercase tracking-[0.3em] text-gold mb-4">
                Detective Tips
              </h2>
              <motion.ul className="space-y-3" variants={stagger(0.06)} initial="hidden" animate="visible">
                <motion.li className="flex gap-3 text-sm text-gray-400" variants={fadeUp} transition={smooth}>
                  <span className="text-gold shrink-0">&bull;</span>
                  Ask open-ended questions first, then drill into details.
                </motion.li>
                <motion.li className="flex gap-3 text-sm text-gray-400" variants={fadeUp} transition={smooth}>
                  <span className="text-gold shrink-0">&bull;</span>
                  If the suspect gets nervous (stress rises), you&apos;re on the right track.
                </motion.li>
                <motion.li className="flex gap-3 text-sm text-gray-400" variants={fadeUp} transition={smooth}>
                  <span className="text-gold shrink-0">&bull;</span>
                  Listen for inconsistencies &mdash; times, places, names that don&apos;t add up.
                </motion.li>
                <motion.li className="flex gap-3 text-sm text-gray-400" variants={fadeUp} transition={smooth}>
                  <span className="text-gold shrink-0">&bull;</span>
                  You get 3 hints. Use them wisely &mdash; each one costs points.
                </motion.li>
                <motion.li className="flex gap-3 text-sm text-gray-400" variants={fadeUp} transition={smooth}>
                  <span className="text-gold shrink-0">&bull;</span>
                  Speed matters. More time remaining = higher score.
                </motion.li>
              </motion.ul>
            </motion.div>

            {/* Scoring */}
            <motion.div className="mb-12 p-5 bg-surface-darker border border-surface-dark rounded-sm" variants={fadeUp} transition={smooth}>
              <h2 className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4">
                Scoring
              </h2>
              <div className="space-y-3 text-sm text-gray-400">
                <div className="flex justify-between">
                  <span>Speed (solve faster than par)</span>
                  <span className="text-green-500">base score</span>
                </div>
                <div className="flex justify-between">
                  <span>Difficulty multiplier</span>
                  <span className="text-green-500">1x / 1.5x / 2x / 2.5x</span>
                </div>
                <div className="flex justify-between">
                  <span>Each hint used</span>
                  <span className="text-accent">&minus;15%</span>
                </div>
                <div className="flex justify-between">
                  <span>Each wrong accusation</span>
                  <span className="text-accent">&minus;10%</span>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-3">
                Harder cases are worth more. Expert clean solves top the leaderboard.
              </p>
            </motion.div>

            {/* About This Game */}
            <motion.div className="mb-12" variants={fadeUp} transition={smooth}>
              <p className="text-xs uppercase tracking-[0.3em] text-accent mb-2">
                Behind the Scenes
              </p>
              <h2 className="text-2xl font-bold tracking-wide mb-6">ABOUT THIS GAME</h2>

              <motion.div className="space-y-6" variants={stagger(0.1)} initial="hidden" animate="visible">
                <motion.div className="bg-surface-darker border border-surface-dark rounded-sm p-6" variants={fadeUp} transition={smooth}>
                  <h3 className="text-xs uppercase tracking-wider text-gold mb-3">The Concept</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    INTERROGATION is an AI red-teaming game disguised as a detective noir.
                    You&apos;re not just playing a game &mdash; you&apos;re adversarially testing an AI model.
                    The suspect is powered by Mistral AI, instructed to maintain a cover story with one hidden lie.
                    Your job is to find the contradiction through questioning alone. Every case is procedurally generated. No two interrogations are the same.
                  </p>
                </motion.div>

                <motion.div className="bg-surface-darker border border-surface-dark rounded-sm p-6" variants={fadeUp} transition={smooth}>
                  <h3 className="text-xs uppercase tracking-wider text-gold mb-3">The Tech</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <img src="/sponsors/mistral.webp" alt="Mistral AI" className="w-6 h-6 mt-0.5 shrink-0" style={{ filter: 'brightness(0) invert(1)' }} />
                      <div>
                        <p className="text-sm text-gray-300 font-bold">Mistral Large 3</p>
                        <p className="text-xs text-gray-500">The suspect&apos;s brain. Generates cases, plays the character, evaluates accusations, and judges your performance. All reasoning happens in real-time via structured JSON responses.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <img src="/sponsors/11labs.webp" alt="ElevenLabs" className="w-6 h-6 mt-0.5 shrink-0" style={{ filter: 'brightness(0) invert(1)' }} />
                      <div>
                        <p className="text-sm text-gray-300 font-bold">ElevenLabs Voice</p>
                        <p className="text-xs text-gray-500">The suspect&apos;s voice. Text-to-speech with dynamic stability that degrades as stress increases &mdash; the AI literally sounds more nervous as you get closer to the truth.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="shrink-0 mt-0.5 opacity-60">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                      <div>
                        <p className="text-sm text-gray-300 font-bold">Voxtral STT</p>
                        <p className="text-xs text-gray-500">Your voice, transcribed. Mistral&apos;s speech-to-text model converts your spoken questions into text for the AI to process. Silence detection auto-stops recording.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div className="bg-surface-darker border border-surface-dark rounded-sm p-6" variants={fadeUp} transition={smooth}>
                  <h3 className="text-xs uppercase tracking-wider text-gold mb-3">Why Red Teaming?</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Red teaming is the practice of adversarially testing AI systems to find weaknesses.
                    In INTERROGATION, the AI is instructed to never confess &mdash; your goal is to find the logical inconsistency it can&apos;t hide.
                    The harder the difficulty, the better the AI is at deflecting, misdirecting, and maintaining composure.
                    You&apos;re essentially stress-testing an LLM&apos;s ability to maintain a consistent narrative under adversarial pressure.
                  </p>
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Actions */}
          <motion.div
            className="flex gap-4 justify-center"
            variants={stagger(0.1)}
            initial="hidden"
            animate="visible"
          >
            <motion.button
              onClick={() => router.push('/cases')}
              className="px-8 py-4 bg-accent text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
              variants={fadeUp}
              transition={smooth}
              whileHover={{ scale: 1.03 }}
            >
              PLAY
            </motion.button>
            <motion.button
              onClick={() => router.push('/')}
              className="px-8 py-4 bg-surface text-white font-bold rounded-lg hover:bg-surface-hover transition-colors"
              variants={fadeUp}
              transition={smooth}
              whileHover={{ scale: 1.03 }}
            >
              BACK
            </motion.button>
          </motion.div>
        </div>
      </PageMotion>
    </PageShell>
  );
}
