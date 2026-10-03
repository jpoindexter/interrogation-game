import Link from 'next/link';

interface Props { message: string; code: string | null; retry: () => void; retryLabel: string }

export default function CasePreparationError({ message, code, retry, retryLabel }: Props) {
  const timeout = code === 'TIMEOUT';
  const uncertain = retryLabel === 'Retry same request';
  return (
    <main className="min-h-screen grid place-items-center bg-black px-6 py-12 font-mono text-foreground">
      <section className="w-full max-w-xl border border-surface bg-surface-darker p-6 sm:p-8" aria-labelledby="case-error-title">
        <p className="text-xs uppercase tracking-[0.25em] text-gold">Case preparation interrupted</p>
        <h1 id="case-error-title" className="mt-4 text-2xl font-bold">{timeout ? 'This file took too long.' : 'The file could not be opened.'}</h1>
        <p role="alert" className="mt-4 text-sm leading-relaxed text-gray-300">
          {uncertain ? 'The connection ended before we could confirm the case. Recover this request before starting another.'
            : 'No playable case was created. You can try another file, or start the authored evidence practice case now.'}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={retry} className="min-h-11 rounded-sm bg-accent px-4 py-3 text-sm font-bold text-white hover:bg-accent-hover">{retryLabel}</button>
          <a href="/game?mode=redteam&difficulty=easy" className="min-h-11 rounded-sm border border-gold px-4 py-3 text-sm text-gold">Start evidence practice</a>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-gray-400">Practice opens a fixed case. Later suspect replies use live AI.</p>
        <details className="mt-6 border-t border-surface pt-4 text-xs text-gray-400">
          <summary className="cursor-pointer py-2">Technical details</summary>
          <p className="mt-2 break-words leading-relaxed">{message}</p>
        </details>
        <Link href="/cases" className="mt-4 inline-flex min-h-11 items-center text-sm text-gray-300 underline underline-offset-4">Back to cases</Link>
      </section>
    </main>
  );
}
