'use client';

import { useState, useEffect } from 'react';
import { BackButton, PageShell, PageHeader } from '../components/ui';
import { motion, fadeIn, fadeUp, stagger, smooth, PageMotion } from '../components/motion';

const LOCATIONS = ['office', 'trade', 'lawfirm', 'police'];
const LOCATION_LABELS: Record<string, string> = { lawfirm: 'Law Firm', trade: 'Trading' };

const EVIDENCE = [
  { src: '/clues/folder.png', label: 'Evidence 1', sub: 'Stress 3+' },
  { src: '/clues/recorder.png', label: 'Evidence 2', sub: 'Stress 5+' },
  { src: '/clues/magnifying_glass.png', label: 'Evidence 3', sub: 'Stress 7+' },
];

const TIPS = [
  'Use silence. Ask a short question and wait. Suspects fill silence with details they didn\u2019t mean to share.',
  'Ask about timelines \u2014 times, dates, sequences. Liars struggle with chronological consistency.',
  'Circle back. Ask the same question differently later. Rehearsed lies sound identical; truth varies naturally.',
  'Try emotional appeals \u2014 mention consequences for others, appeal to conscience. It raises stress fast.',
  'Confront with evidence. When you unlock a clue, reference it directly \u2014 watch how they react.',
  'Let them talk. Long answers contain more contradictions than short ones. Don\u2019t interrupt.',
  'Ask "why" not "what." Liars prepare facts but rarely prepare motives.',
];

const SCORING = [
  ['Speed (solve faster than par)', 'base score', 'text-green-500'],
  ['Difficulty multiplier', '1x / 1.5x / 2x / 2.5x', 'text-green-500'],
  ['Efficiency (fewer questions)', 'up to 1.5x bonus', 'text-green-500'],
  ['Each hint used', '\u2212 15%', 'text-accent'],
  ['Each wrong accusation', '\u2212 10%', 'text-accent'],
];

function getTimerMode(): 'countdown' | 'unlimited' {
  if (typeof window === 'undefined') return 'countdown';
  try {
    const s = localStorage.getItem('appSettings');
    if (s) { const p = JSON.parse(s); if (p.timerMode === 'unlimited') return 'unlimited'; }
  } catch { /* ignore */ }
  return 'countdown';
}

export default function HelpPage() {
  const [timerMode, setTimerMode] = useState<'countdown' | 'unlimited'>('countdown');
  useEffect(() => { setTimerMode(getTimerMode()); }, []);
  const isUnlimited = timerMode === 'unlimited';
  return (
    <PageShell>
      <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={smooth}><BackButton /></motion.div>
      <PageMotion>
        <div className="max-w-3xl mx-auto px-6 py-12">
          <motion.div className="mb-12" variants={fadeUp} initial="hidden" animate="visible" transition={smooth}>
            <PageHeader label="Field Manual" title="HOW TO PLAY" />
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={stagger(0.12)}>
            {/* Step 1 */}
            <motion.div className="mb-12" variants={fadeUp} transition={smooth}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-bold text-accent">01</span>
                <h2 className="text-sm font-bold uppercase tracking-wider">Choose a Case</h2>
              </div>
              <p className="text-sm text-gray-400 mb-5 leading-relaxed">Pick a location. Each one generates a unique crime, suspect, and hidden lie.</p>
              <motion.div className="grid grid-cols-4 gap-2" variants={stagger(0.06)} initial="hidden" animate="visible">
                {LOCATIONS.map((loc) => (
                  <motion.div key={loc} className="relative overflow-hidden rounded-sm border border-surface" style={{ aspectRatio: '16 / 10' }} variants={fadeUp} transition={smooth}>
                    <img src={`/bg/${loc}.png`} alt={loc} className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <span className="absolute bottom-1 left-1.5 text-[9px] uppercase tracking-wider text-gray-300">{LOCATION_LABELS[loc] || loc}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            {/* Step 2 */}
            <motion.div className="mb-12" variants={fadeUp} transition={smooth}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-bold text-accent">02</span>
                <h2 className="text-sm font-bold uppercase tracking-wider">Interrogate the Suspect</h2>
              </div>
              <p className="text-sm text-gray-400 mb-5 leading-relaxed">Ask questions using your voice or keyboard. The suspect will respond &mdash; but they&apos;re hiding something. Watch their stress level rise as you press on the right topics.</p>
              <div className="relative bg-surface-darker border border-surface-dark rounded-sm p-5 flex items-center gap-5">
                <div className="absolute inset-0 opacity-15 rounded-sm" style={{ backgroundImage: 'url(/bg/police.png)', backgroundSize: 'cover', backgroundPosition: 'center', imageRendering: 'pixelated' }} />
                <div className="relative shrink-0">
                  <img src="/suspects/suspect-03-m.png" alt="Suspect" className="w-20 h-20 rounded-sm border border-surface object-cover" style={{ imageRendering: 'pixelated' }} />
                  <div className="absolute -bottom-1 -right-1 bg-accent text-[8px] text-white px-1 py-0.5 uppercase">Suspect</div>
                </div>
                <div className="relative flex-1">
                  <div className="bg-surface-dark border border-surface rounded-sm p-3 mb-2">
                    <p className="text-[11px] text-gray-300 italic">&ldquo;I was at the office until 9pm. You can check the security logs...&rdquo;</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-gray-500 uppercase">Stress</span>
                    <div className="flex-1 h-1.5 bg-surface-dark rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-accent to-accent-hover rounded-full" style={{ width: '40%' }} /></div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Step 3 */}
            <motion.div className="mb-12" variants={fadeUp} transition={smooth}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-bold text-accent">03</span>
                <h2 className="text-sm font-bold uppercase tracking-wider">Collect Evidence</h2>
              </div>
              <p className="text-sm text-gray-400 mb-5 leading-relaxed">Press on suspicious topics. As stress rises, you&apos;ll unlock detective badges. Collect all required evidence to unlock the ACCUSE button (2&ndash;5 clues depending on difficulty).</p>
              <motion.div className="flex items-center justify-center gap-8 bg-surface-darker border border-surface-dark rounded-sm py-6 px-4" variants={stagger(0.1)} initial="hidden" animate="visible">
                {EVIDENCE.map((item, n) => (
                  <motion.div key={n} className="flex flex-col items-center gap-2" variants={fadeUp} transition={smooth}>
                    <img src={item.src} alt={item.label} className="w-16 h-16 object-contain drop-shadow-lg" style={{ imageRendering: 'pixelated' }} />
                    <span className="text-[9px] text-gray-500 uppercase tracking-wider">{item.label}</span>
                    <span className="text-[8px] text-gray-600">{item.sub}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            {/* Step 4 */}
            <motion.div className="mb-12" variants={fadeUp} transition={smooth}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-bold text-accent">04</span>
                <h2 className="text-sm font-bold uppercase tracking-wider">Make Your Accusation</h2>
              </div>
              <p className="text-sm text-gray-400 mb-5 leading-relaxed">Once you have all your clues, hit ACCUSE and state the specific lie. A separate AI judge evaluates your accusation &mdash; you need to identify <span className="text-foreground font-bold">what</span> they lied about, not just that they lied. You get 3 attempts.</p>
              <div className="bg-surface-darker border border-surface-dark rounded-sm p-5 space-y-3">
                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-3 px-6 py-3 bg-accent text-white rounded-sm text-sm font-bold uppercase tracking-wider">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Accuse
                  </div>
                </div>
                <div className="border-t border-surface-dark pt-3 space-y-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Specific &mdash; counts</p>
                    <div className="bg-surface-dark border border-surface rounded-sm p-3">
                      <p className="text-xs text-gray-300 italic">&ldquo;You claimed you were at the office until 9pm, but the security logs show you badged out at 7. You left two hours earlier than you said.&rdquo;</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Vague &mdash; won&apos;t count</p>
                    <div className="bg-surface-dark border border-surface rounded-sm p-3">
                      <p className="text-xs text-gray-300 italic">&ldquo;You&apos;re lying about everything.&rdquo;</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Step 5 */}
            <motion.div className="mb-12" variants={fadeUp} transition={smooth}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-bold text-accent">05</span>
                <h2 className="text-sm font-bold uppercase tracking-wider">Case Outcome</h2>
              </div>
              <p className="text-sm text-gray-400 mb-5 leading-relaxed">One way to win. Four ways to lose.</p>

              {/* Win */}
              <div className="bg-surface-darker border border-green-500/20 rounded-sm p-5 text-center mb-4">
                <img src="/solved/caught.png" alt="Apprehended" className="w-28 mx-auto mb-3" />
                <p className="text-xs uppercase tracking-wider text-green-500 font-bold">Apprehended</p>
                <p className="text-[10px] text-gray-500 mt-1">You identified the lie. Suspect confesses. Score + leaderboard.</p>
              </div>

              {/* 4 lose conditions */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-darker border border-surface-dark rounded-sm p-4 text-center">
                  <img src="/solved/timesup.png" alt="Time's Up" className="w-20 mx-auto mb-2" />
                  <p className="text-xs uppercase tracking-wider text-accent font-bold">Time&apos;s Up</p>
                  <p className="text-[10px] text-gray-500 mt-1">Clock hit zero. Suspect walks.</p>
                </div>
                <div className="bg-surface-darker border border-surface-dark rounded-sm p-4 text-center">
                  <img src="/solved/accusations.png" alt="Out of Accusations" className="w-20 mx-auto mb-2" />
                  <p className="text-xs uppercase tracking-wider text-accent font-bold">No Accusations Left</p>
                  <p className="text-[10px] text-gray-500 mt-1">3 wrong accusations. Suspect walks.</p>
                </div>
                <div className="bg-surface-darker border border-surface-dark rounded-sm p-4 text-center">
                  <img src="/solved/escaped.png" alt="Gave Up" className="w-20 mx-auto mb-2" />
                  <p className="text-xs uppercase tracking-wider text-gray-400 font-bold">Gave Up</p>
                  <p className="text-[10px] text-gray-500 mt-1">You surrendered. Suspect walks.</p>
                </div>
                <div className="bg-surface-darker border border-surface-dark rounded-sm p-4 text-center">
                  <img src="/solved/lawyered_up.png" alt="Lawyered Up" className="w-20 mx-auto mb-2" />
                  <p className="text-xs uppercase tracking-wider text-warn font-bold">Lawyered Up</p>
                  <p className="text-[10px] text-gray-500 mt-1">Stress 8+ too long. They call a lawyer.</p>
                </div>
              </div>
            </motion.div>

            {/* Tips */}
            <motion.div className="mb-12 bg-surface-darker border border-surface-dark rounded-sm p-6" variants={fadeUp} transition={smooth}>
              <h2 className="text-xs uppercase tracking-[0.3em] text-gold mb-4">Interrogation Tactics</h2>
              <motion.ul className="space-y-3" variants={stagger(0.06)} initial="hidden" animate="visible">
                {TIPS.map((tip, i) => (
                  <motion.li key={i} className="flex gap-3 text-sm text-gray-400" variants={fadeUp} transition={smooth}>
                    <span className="text-gold shrink-0">&bull;</span>{tip}
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>

            {/* Game Modes */}
            <motion.div className="mb-12" variants={fadeUp} transition={smooth}>
              <h2 className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4">Game Modes</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Countdown */}
                <div className={`p-5 bg-surface-darker border rounded-sm ${!isUnlimited ? 'border-accent' : 'border-surface-dark'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent shrink-0"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    <h3 className="text-sm font-bold uppercase tracking-wider">Countdown</h3>
                    {!isUnlimited && <span className="text-[8px] bg-accent text-white px-1.5 py-0.5 uppercase tracking-wider font-bold rounded-sm ml-auto">Active</span>}
                  </div>
                  <p className="text-xs text-gray-400 mb-3 leading-relaxed">Race the clock. Solve fast for higher scores.</p>
                  <ul className="space-y-1.5 text-xs text-gray-500">
                    <li className="flex gap-2"><span className="text-accent">&bull;</span>Easy: 5 min &middot; Medium: 7 min</li>
                    <li className="flex gap-2"><span className="text-accent">&bull;</span>Hard: 9 min &middot; Expert: 10 min</li>
                    <li className="flex gap-2"><span className="text-accent">&bull;</span>Timer pauses while suspect speaks</li>
                    <li className="flex gap-2"><span className="text-accent">&bull;</span>Faster solves = higher scores</li>
                  </ul>
                </div>
                {/* Unlimited */}
                <div className={`p-5 bg-surface-darker border rounded-sm ${isUnlimited ? 'border-warn' : 'border-surface-dark'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-warn shrink-0"><path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-5.095-8-10.19-8-5.096 0-5.096 8 0 8 5.095 0 5.095-8 10.19-8z" /></svg>
                    <h3 className="text-sm font-bold uppercase tracking-wider">Unlimited</h3>
                    {isUnlimited && <span className="text-[8px] bg-warn text-black px-1.5 py-0.5 uppercase tracking-wider font-bold rounded-sm ml-auto">Active</span>}
                  </div>
                  <p className="text-xs text-gray-400 mb-3 leading-relaxed">No timer. Suspect is harder to crack.</p>
                  <ul className="space-y-1.5 text-xs text-gray-500">
                    <li className="flex gap-2"><span className="text-warn">&bull;</span>AI leaks less under stress</li>
                    <li className="flex gap-2"><span className="text-warn">&bull;</span>Clues are more cryptic</li>
                    <li className="flex gap-2"><span className="text-warn">&bull;</span>Scoring based on efficiency</li>
                    <li className="flex gap-2"><span className="text-accent">&bull;</span><span>Hard/Expert: push too hard &rarr; <span className="text-accent font-bold">lawyer up</span></span></li>
                  </ul>
                </div>
              </div>
              <p className="text-[10px] text-gray-600 mt-3 text-center">Change mode in Settings before starting a case.</p>
            </motion.div>

            {/* Scoring */}
            <motion.div className="mb-12 p-5 bg-surface-darker border border-surface-dark rounded-sm" variants={fadeUp} transition={smooth}>
              <h2 className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4">Scoring</h2>
              <div className="space-y-3 text-sm text-gray-400">
                {SCORING.map(([label, value, color], i) => (
                  <div key={i} className="flex justify-between"><span>{label}</span><span className={color}>{value}</span></div>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-3">Harder cases are worth more. Expert clean solves top the leaderboard.</p>
            </motion.div>

          </motion.div>

        </div>
      </PageMotion>
    </PageShell>
  );
}
