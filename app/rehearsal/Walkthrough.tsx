'use client';
import Link from 'next/link';
import { useReducer } from 'react';
import { RECORDING } from './recording';
import { navigateRehearsal, type RehearsalAction } from './navigation';
import RecordedStep from './RecordedStep';
import RecordedPath from './RecordedPath';
import RecordedProvenance from './RecordedProvenance';

function Navigation({ index, count, onNavigate }: { index: number; count: number; onNavigate: (action: RehearsalAction) => void }) {
  const button = 'min-h-11 border border-surface px-4 py-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-40';
  return <nav aria-label="Recorded walkthrough navigation" className="mt-5 flex flex-wrap gap-3">
    <button type="button" className={button} disabled={index === 0} onClick={() => onNavigate('back')}>Back</button>
    <button type="button" className={`${button} bg-gold font-bold text-black`} disabled={index === count - 1} onClick={() => onNavigate('next')}>Next recorded step</button>
    <button type="button" className={button} onClick={() => onNavigate('restart')}>Restart recording</button>
  </nav>;
}

export default function Walkthrough() {
  const [index, navigate] = useReducer((current: number, action: RehearsalAction) => navigateRehearsal(current, action, RECORDING.steps.length), 0);
  const step = RECORDING.steps[index];
  return <main className="min-h-dvh bg-black text-foreground">
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-gold bg-black px-5 py-3">
      <p className="font-bold text-gold">Recorded · not live AI</p>
      <Link href="/cases" className="min-h-11 py-3 text-sm underline underline-offset-4">Back to cases</Link>
    </header>
    <div className="mx-auto max-w-3xl px-5 py-7 sm:px-8">
      <h1 className="text-2xl font-bold">{RECORDING.title}</h1>
      <p className="mt-3 text-base leading-relaxed text-gray-300">A read-only walkthrough of a saved local run. Next and Back move through recorded steps. No AI response is requested and no game result is submitted.</p>
      <p className="mt-3 text-sm leading-relaxed text-gray-300">{RECORDING.briefing}</p>
      <p role="status" aria-live="polite" aria-atomic="true" className="my-5 text-sm font-bold text-gold">Step {index + 1} of {RECORDING.steps.length}: {step.title}</p>
      <RecordedStep step={step} />
      <Navigation index={index} count={RECORDING.steps.length} onNavigate={navigate} />
      {index === RECORDING.steps.length - 1 && <RecordedPath steps={RECORDING.steps} />}
      <RecordedProvenance recording={RECORDING} />
    </div>
  </main>;
}
