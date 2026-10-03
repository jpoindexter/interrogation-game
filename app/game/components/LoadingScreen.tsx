'use client';

import { useEffect, useState } from 'react';
import { useMotionPreference } from '../../components/useMotionPreference';
import { elapsedLabel, loadingMessage, loadingTitle, LOADING_STEPS, type LoadingPhase } from './loading-presentation';

interface LoadingScreenProps {
  /** Only pass a stage reported by the server; elapsed time must not advance it. */
  phase?: LoadingPhase;
  elapsedSeconds?: number;
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

export default function LoadingScreen({ phase, elapsedSeconds }: LoadingScreenProps = {}) {
  const localElapsed = useElapsedSeconds(elapsedSeconds === undefined && phase !== 'ready');
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
          <LoadingActivity ready={phase === 'ready'} />
          <LoadingStages phase={phase} />
          {!phase && <p className="text-xs leading-relaxed text-gray-400">Waiting for a stage update. These steps show the process, not measured progress.</p>}
          <LoadingInstructions />
        </div>
      </section>
    </main>
  );
}

function LoadingActivity({ ready }: { ready: boolean }) {
  const reducedMotion = useMotionPreference();
  if (ready) return <div aria-hidden="true" className="h-2 w-full rounded-sm bg-gold" />;
  if (reducedMotion) return <div role="progressbar" aria-label="Waiting for case" className="h-2 rounded-sm border border-gold/60 bg-gold/20" />;
  return <progress aria-label="Waiting for case" className="block h-2 w-full accent-[#b9a267]" />;
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
