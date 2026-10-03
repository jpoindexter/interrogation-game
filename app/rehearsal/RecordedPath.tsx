import { stepVerdict } from './RecordedStep';
import type { RecordedStep } from './types';

export default function RecordedPath({ steps }: { steps: RecordedStep[] }) {
  return <section aria-labelledby="recorded-path-title" className="mt-6 border border-surface p-5">
    <h2 id="recorded-path-title" className="text-lg font-bold text-gold">The recorded route</h2>
    <ol className="mt-4 space-y-3 border-l border-surface pl-5 text-sm leading-relaxed">
      {steps.map((step, index) => <li key={step.title}>
        <p className="font-bold">{index + 1}. {step.title}</p>
        <p className="text-gray-300">{stepVerdict(step)}</p>
      </li>)}
    </ol>
  </section>;
}
