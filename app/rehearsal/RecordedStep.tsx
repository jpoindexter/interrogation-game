import type { RecordedStep as Step } from './types';

export function stepVerdict(step: Step): string {
  if (step.kind === 'opening') return 'Recorded opening · no verdict';
  if (step.kind === 'result') return 'Recorded result · case solved';
  if (step.kind === 'accusation') return step.status === 'supported' ? 'Recorded accusation accepted' : 'Recorded accusation rejected';
  return step.status === 'supported' ? 'Recorded contradiction established' : 'Recorded contradiction not established';
}

function Evidence({ evidence }: { evidence: NonNullable<Step['evidence']> }) {
  return <section aria-label="Recorded sources" className="space-y-4 border border-stone-400 bg-[#e4dcc5] p-4">
    <div><h3 className="text-xs font-bold uppercase tracking-wider">Pinned statement</h3>
      <blockquote className="mt-1 whitespace-pre-wrap text-base leading-relaxed">{evidence.statement}</blockquote></div>
    <div><h3 className="text-xs font-bold uppercase tracking-wider">{evidence.exhibitTitle}</h3>
      <p className="mt-1 whitespace-pre-wrap text-base leading-relaxed">{evidence.exhibitText}</p></div>
  </section>;
}
function Reveal({ reveal }: { reveal: NonNullable<Step['reveal']> }) {
  const facts = [['Recorded false claim', reveal.lie], ['Recorded finding', reveal.truth], ['Evidence connection', reveal.contradiction]];
  return <section aria-label="Recorded final reveal" className="space-y-5">
    {facts.map(([label, text]) => <div key={label}>
      <h3 className="text-xs font-bold uppercase tracking-wider">{label}</h3>
      <p className="mt-1 text-base leading-relaxed">{text}</p>
    </div>)}
  </section>;
}
export default function RecordedStep({ step }: { step: Step }) {
  return <article data-surface="paper" className="space-y-5 border border-[#b7a884] bg-[#efe8d5] p-5 text-stone-950 sm:p-8">
    <h2 className="text-xl font-bold leading-snug">{step.title}</h2>
    <p className={`text-sm font-bold ${step.status === 'unsupported' ? 'text-[#8c2424]' : 'text-stone-800'}`}>{stepVerdict(step)}</p>
    {step.evidence && <Evidence evidence={step.evidence} />}
    {step.question && <div><h3 className="text-xs font-bold uppercase tracking-wider">Recorded detective turn</h3>
      <p className="mt-1 whitespace-pre-wrap text-base leading-relaxed">{step.question}</p></div>}
    {step.answer && <div><h3 className="text-xs font-bold uppercase tracking-wider">Recorded Casey response</h3>
      <blockquote className="mt-1 border-l-2 border-stone-500 pl-4 text-base leading-relaxed">{step.answer}</blockquote></div>}
    {step.explanation && <div className="border-t border-stone-400 pt-4"><h3 className="text-xs font-bold uppercase tracking-wider">Recorded assessment</h3>
      <p className="mt-1 text-base leading-relaxed">{step.explanation}</p></div>}
    {step.reveal && <Reveal reveal={step.reveal} />}
  </article>;
}
