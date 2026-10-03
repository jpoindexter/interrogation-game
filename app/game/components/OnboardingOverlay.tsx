'use client';

import ModalSurface from '../../components/ModalSurface';
import { finishOnboarding } from './onboarding-state';

const GUIDANCE = [
  {
    title: 'Read, then question',
    text: 'Review the briefing before you begin. During the interview, type a question or use the microphone when voice is available.',
  },
  {
    title: 'Follow the evidence',
    text: 'Compare the suspect’s account with the clues and records. Stress reflects the fictional character’s reaction; it is not proof of a lie.',
  },
  {
    title: 'Name the contradiction',
    text: 'Collect the required clues to unlock Accuse. Explain what the suspect said and what the evidence shows happened. You have three attempts.',
  },
];

export default function OnboardingOverlay({ onClose }: { onClose: () => void }) {
  const finish = () => finishOnboarding(onClose);
  return (
    <ModalSurface label="Before your first interview" onClose={finish}>
      <div className="flex min-h-full items-center justify-center bg-black/70 p-4">
        <section className="w-full max-w-xl rounded-sm border border-gold/30 bg-surface-dark p-6 text-foreground sm:p-8">
          <p className="mb-3 text-sm uppercase tracking-widest text-gold">Detective’s introduction</p>
          <h2 className="mb-6 text-2xl font-bold">Before your first interview</h2>
          <ol className="space-y-5">
            {GUIDANCE.map((item, index) => (
              <li key={item.title}>
                <h3 className="mb-1 font-bold text-gold">{index + 1}. {item.title}</h3>
                <p className="text-base leading-relaxed text-gray-300">{item.text}</p>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={finish}
            className="mt-7 min-h-11 w-full bg-gold px-5 py-3 font-bold text-black hover:bg-gold-hover"
          >
            Return to briefing
          </button>
        </section>
      </div>
    </ModalSurface>
  );
}
