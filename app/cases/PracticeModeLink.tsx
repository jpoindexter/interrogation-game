import Link from 'next/link';

export default function PracticeModeLink() {
  return (
    <section aria-labelledby="practice-mode-title" className="relative z-30 mt-6 w-full max-w-lg border border-[#b7a884] bg-[#efe8d5] p-4 text-stone-950">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#772323]">Authored practice case</p>
      <h2 id="practice-mode-title" className="mt-1 text-lg font-bold">Test an account against the record</h2>
      <p className="mt-2 text-sm leading-relaxed">A fixed case with disclosed exhibits and checkable contradictions. Pin a statement, choose an approach, and edit your question. The photos above open free-form generated cases.</p>
      <Link href="/game?mode=redteam&difficulty=easy" className="mt-3 inline-block border-2 border-stone-950 bg-stone-950 px-4 py-3 text-sm font-bold text-[#efe8d5] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#772323]">
        Start evidence practice
      </Link>
      <p className="mt-4 text-sm">
        <Link href="/rehearsal" className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#772323]">View recorded walkthrough — not live AI</Link>
      </p>
    </section>
  );
}
