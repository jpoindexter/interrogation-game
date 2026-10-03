import type { ReactNode } from 'react';
import Link from 'next/link';
import AssetImage from '../../components/AssetImage';

export function ResultFrame({ artwork, caseNumber, title, children }: {
  artwork: string; caseNumber: string; title: string; children: ReactNode;
}) {
  return <main className="min-h-screen bg-black text-foreground font-mono overflow-y-auto relative">
    <Link href="/cases" className="absolute top-6 right-6 text-sm text-gray-300 hover:text-white uppercase tracking-wider z-20">&larr; Cases</Link>
    <div className="max-w-2xl mx-auto px-6 sm:px-8 pb-8 relative z-10">
      <header className="text-center pt-20 mb-8">
        <AssetImage src={artwork} alt="" width={64} height={64} className="mx-auto mb-4 h-16 w-16" style={{ imageRendering: 'pixelated' }} />
        <p className="text-lg uppercase tracking-[0.3em] text-accent font-bold mb-2">Case #{caseNumber}</p>
        <h1 className="text-xl sm:text-2xl font-semibold">{title}</h1>
      </header>
      {children}
    </div>
  </main>;
}
export function MissingResult() {
  return <main className="min-h-screen bg-black text-foreground font-mono flex flex-col items-center justify-center gap-4 p-8">
    <h1 className="text-2xl">No saved result is available</h1>
    <p className="text-gray-300">The session may have been cleared or the saved result could not be read.</p>
    <Link className="text-gold underline" href="/cases">Choose a case</Link>
  </main>;
}
export function ResultStatus({ error, retry }: { error?: string; retry: () => void }) {
  return <div className="bg-surface-dark p-6 mb-6 rounded-sm" role="status">
    <p>{error || 'Retrieving the recorded case result…'}</p>
    {error && <button className="mt-4 text-gold underline" onClick={retry}>Retry debrief</button>}
  </div>;
}

export function ResultRecovery({ pending, error, retry }: { pending: boolean; error?: string; retry: () => void }) {
  if (!pending && !error) return <MissingResult />;
  return <main className="min-h-screen grid place-content-center bg-black text-foreground p-8">
    <h1 className="text-xl mb-4">Recovering your recorded result</h1>
    <ResultStatus error={error} retry={retry} />
    <Link href="/cases" className="text-gold underline">Back to cases</Link>
  </main>;
}
