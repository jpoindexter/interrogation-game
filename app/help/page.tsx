'use client';

import Link from 'next/link';
import { TIME_LIMITS } from '@/lib/game-state';
import AssetImage from '../components/AssetImage';
import { usePreferences } from '../settings/usePreferences';
import { BackButton, PageShell, PageHeader } from '../components/ui';
import { PageMotion } from '../components/motion';
import { QUESTION_TIPS, OUTCOMES } from './guide-content';

function QuestionGuide() {
  return <section className="space-y-4">
    <h2 className="text-lg font-bold">Question the account</h2>
    <p>Read the briefing and objective before beginning. Use the keyboard or microphone to ask a question. If voice is unavailable, continue with text.</p>
    <ul className="list-disc space-y-2 pl-5">{QUESTION_TIPS.map(tip => <li key={tip}>{tip}</li>)}</ul>
    <p>A failed request should keep your draft available for retry. Check the displayed response or error before submitting another question.</p>
  </section>;
}

function EvidenceGuide() {
  return <section className="space-y-4 border border-surface bg-surface-darker p-5">
    <h2 className="text-lg font-bold text-gold">Pin, compare, challenge</h2>
    <ol className="list-decimal space-y-3 pl-5">
      <li>Choose a recorded suspect statement and pin its exact words. View source returns to that turn.</li>
      <li>Choose Clarify, Present evidence or Leave space. Each prepares a question you can edit or cancel.</li>
      <li>For Present evidence, choose a disclosed exhibit and read it alongside the pinned quote.</li>
      <li>Review the question and explicitly send it. The result explains whether that pair established a contradiction.</li>
    </ol>
    <p>These controls apply to the reviewed evidence challenge. Generated cases use the clues and accusation requirement shown in their case file. Decorative clue icons do not prove the existence of a physical object.</p>
  </section>;
}

function AccusationGuide() {
  return <section className="space-y-4">
    <h2 className="text-lg font-bold">Make the accusation</h2>
    <p>State what the suspect lied about and what the case supports instead. Include the relevant statement or exhibit. A vague claim such as “you did it” is not enough.</p>
    <p>The game shows the remaining attempts and evidence requirement. The verdict is separate from the suspect&apos;s acting. Review your words before confirming, particularly after voice transcription.</p>
    <p>An unavailable provider or invalid response is an error to retry, not evidence that your accusation was wrong.</p>
  </section>;
}

function TimerGuide() {
  const unlimited = usePreferences().timerMode === 'unlimited';
  return <section className="space-y-4 border border-surface bg-surface-darker p-5">
    <h2 className="text-lg font-bold">Time and score</h2>
    <p>Your preference: <strong>{unlimited ? 'Unlimited' : 'Countdown'}</strong>. Change it before starting a new case.</p>
    <p>Countdown uses a server deadline. The clock continues during requests and spoken replies. Unlimited removes that deadline; other case rules and provider usage limits remain.</p>
    <ul className="flex flex-wrap gap-4">{Object.entries(TIME_LIMITS).map(([difficulty, seconds]) => <li key={difficulty} className="capitalize">{difficulty}: {seconds / 60} minutes</li>)}</ul>
    <p>The current score uses elapsed time, difficulty, question count, hints and incorrect accusations. Unlimited removes time pressure from losing, but does not turn scoring into an efficiency-only formula.</p>
    <p>A leaderboard entry is recorded only after storage confirms it. If saving fails, keep the result open and retry.</p>
  </section>;
}

function OutcomesGuide() {
  return <section className="space-y-4">
    <h2 className="text-lg font-bold">Read the outcome</h2>
    <div className="grid gap-3 sm:grid-cols-2">{OUTCOMES.map(outcome => <article key={outcome.title} className="border border-surface bg-surface-darker p-4">
      <AssetImage src={outcome.image} alt="" className="mx-auto mb-3 w-20" />
      <h3 className="font-bold text-gray-200">{outcome.title}</h3>
      <p className="mt-2">{outcome.description}</p>
    </article>)}</div>
  </section>;
}

export default function HelpPage() {
  return <PageShell><BackButton /><PageMotion>
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-12 text-sm leading-relaxed text-gray-300">
      <PageHeader label="Field manual" title="HOW TO PLAY" />
      <QuestionGuide /><EvidenceGuide /><AccusationGuide /><TimerGuide /><OutcomesGuide />
      <p>Need audio or provider setup? <Link href="/settings" className="text-gold underline underline-offset-2">Open Settings</Link>.</p>
    </main>
  </PageMotion></PageShell>;
}
