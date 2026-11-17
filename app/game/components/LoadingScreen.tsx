'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMotionPreference } from '../../components/useMotionPreference';
import { elapsedLabel, loadingMessage, loadingTitle, LOADING_STEPS, type LoadingPhase } from './loading-presentation';

interface LoadingScreenProps {
  /** Only pass a stage reported by the server; elapsed time must not advance it. */
  phase?: LoadingPhase;
  elapsedSeconds?: number;
  onRecover?: () => void;
}

function useElapsedSeconds(enabled: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const started = Date.now();
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [enabled]);
  return seconds;
}

export default function LoadingScreen({ phase, elapsedSeconds, onRecover }: LoadingScreenProps = {}) {
  const localElapsed = useElapsedSeconds(elapsedSeconds === undefined && phase !== 'ready');
  const [readyWaited, setReadyWaited] = useState(false);
  useEffect(() => {
    if (phase !== 'ready') return;
    const timer = window.setTimeout(() => setReadyWaited(true), 5000);
    return () => window.clearTimeout(timer);
  }, [phase]);
  const elapsed = elapsedSeconds ?? localElapsed;
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-black px-5 py-10 font-mono text-foreground">
      <div aria-hidden="true" className="absolute inset-0 bg-[url('/detective/desk.png')] bg-contain bg-center bg-no-repeat opacity-30 [image-rendering:pixelated]" />
      <section aria-label="Case preparation" className="relative z-10 w-full max-w-xl border border-stone-700 bg-[#151413]/95 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-700 px-6 py-3 text-xs uppercase tracking-wider">
          <span className="text-gold">Detective’s desk</span>
          <span className="tabular-nums text-gray-300">{elapsedLabel(elapsed)}</span>
        </div>
        <div className="space-y-5 p-6 sm:p-8">
          <div role="status" aria-live="polite" aria-atomic="true" className="space-y-3">
            <h1 className="text-2xl font-bold text-foreground">{loadingTitle(phase)}</h1>
            <p className="text-sm leading-relaxed text-gray-300">{loadingMessage(phase, elapsed)}</p>
          </div>
          <LoadingActivity phase={phase} />
          <LoadingStages phase={phase} />
          {!phase && <p className="text-xs leading-relaxed text-gray-400">Waiting for a stage update. These steps show the process, not measured progress.</p>}
          {phase === 'ready' && readyWaited && onRecover && <button type="button" onClick={onRecover}
            className="min-h-11 rounded-sm border border-gold px-4 py-3 text-sm font-bold text-gold hover:bg-gold/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">
            Open saved case
          </button>}
          <LoadingInstructions />
          <Link href="/cases" className="inline-flex min-h-11 items-center text-sm text-gray-300 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">Back to cases</Link>
          <p className="text-xs leading-relaxed text-gray-400">Reopening the same selection checks this saved request.</p>
        </div>
      </section>
    </main>
  );
}

function LoadingActivity({ phase }: { phase?: LoadingPhase }) {
  const reducedMotion = useMotionPreference();
  return <div role="progressbar" aria-label="Case preparation" aria-valuetext={phase === 'ready' ? 'Case saved' : 'In progress, completion time unknown'}
    className="relative h-2 w-full overflow-hidden rounded-sm border border-gold/60 bg-gold/15">
    <div aria-hidden="true" className={phase === 'ready' ? 'h-full w-full bg-gold'
      : reducedMotion ? 'h-full w-1/3 bg-gold/70' : 'case-preparation-trace h-full w-1/3 bg-gold'} />
  </div>;
}

function LoadingStages({ phase }: { phase?: LoadingPhase }) {
  const active = LOADING_STEPS.findIndex(step => step.phase === phase);
  return (
    <ol aria-label="Case preparation stages" className="grid grid-cols-4 gap-2">
      {LOADING_STEPS.map((step, index) => {
        const reached = active >= index;
        return (
          <li key={step.phase} aria-current={phase === step.phase ? 'step' : undefined}
            className={`border-t-2 pt-3 text-xs ${reached ? 'border-gold text-gold' : 'border-stone-600 text-gray-400'}`}>
            <span aria-hidden="true" className="mb-1 block font-bold">{active > index || phase === 'ready' ? '✓' : `0${index + 1}`}</span>
            <span className="sr-only">{active > index ? 'Completed: ' : phase === step.phase ? 'Current: ' : 'Upcoming: '}</span>
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}

function LoadingInstructions() {
  return (
    <aside data-surface="paper" aria-label="While you wait" className="border-l-4 border-[#b9a267] bg-[#efe8d5] p-4 text-stone-950">
      <h2 className="text-xs font-bold uppercase tracking-wider">Your first move</h2>
      <p className="mt-2 text-sm leading-relaxed">Read the opening account, then ask about one specific time, action or detail. Keep the suspect’s original words available for comparison.</p>
      <p className="mt-3 text-xs leading-relaxed">New-case preparation does not use your interview time. The timer starts when you begin the interrogation.</p>
    </aside>
  );
}
