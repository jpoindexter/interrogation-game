'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import ModalSurface from '../../components/ModalSurface';
import type { LeaderboardReceipt } from '../result/types';

interface InitialsEntryProps {
  score: number;
  onSubmit: (initials: string) => Promise<LeaderboardReceipt>;
  onViewScore: () => void;
  onViewLeaderboard: () => void;
}
function useInitialsSubmission(onSubmit: InitialsEntryProps['onSubmit']) {
  const [initials, setInitials] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');
  const [savedInitials, setSavedInitials] = useState('');
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending.current || status === 'saved' || !/^[A-Z0-9]{1,3}$/.test(initials)) return;
    pending.current = true;
    setStatus('saving');
    try {
      const receipt = await onSubmit(initials);
      try { sessionStorage.setItem('newLeaderboardEntry', String(receipt.id)); } catch { /* Saving succeeded even if browser storage is full. */ }
      if (mounted.current) { setSavedInitials(receipt.playerName || initials); setStatus('saved'); }
    } catch (failure) {
      if (mounted.current) { setStatus('error'); setError(failure instanceof Error ? failure.message : 'Score not saved. Please retry.'); }
    } finally { pending.current = false; }
  };
  return { initials, setInitials, savedInitials, status, error, submit };
}

function InitialsForm({ submission }: { submission: ReturnType<typeof useInitialsSubmission> }) {
  return <form onSubmit={submission.submit} className="space-y-5">
    <label className="block text-gray-200" htmlFor="player-initials">Your initials (1–3 letters or numbers)</label>
    <input autoFocus id="player-initials" autoComplete="off" maxLength={3} value={submission.initials}
      onChange={event => submission.setInitials(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
      disabled={submission.status === 'saving'} className="w-40 rounded-sm bg-surface p-4 text-center text-4xl text-gold border border-gold" />
    <div role="status" aria-live="polite">{submission.status === 'saving' ? 'Saving score…' : submission.error}</div>
    <button disabled={!submission.initials || submission.status === 'saving'} className="block mx-auto bg-gold text-black px-8 py-3 font-bold disabled:opacity-50">
      {submission.status === 'error' ? 'Retry save' : 'Save score'}
    </button>
  </form>;
}

export default function InitialsEntry({ score, onSubmit, onViewScore, onViewLeaderboard }: InitialsEntryProps) {
  const submission = useInitialsSubmission(onSubmit);
  return <ModalSurface label="Save your score" onClose={onViewScore}>
    <div className="min-h-full flex items-center justify-center bg-black/90 p-6 font-mono">
      <section className="text-center max-w-lg w-full bg-surface-dark p-8 rounded-sm border border-surface">
        <h2 className="text-gold uppercase tracking-widest mb-3">Save your score</h2>
        <p className="text-5xl font-bold text-gold tabular-nums mb-6">{score.toLocaleString()}</p>
        {submission.status === 'saved' ? <div role="status" className="space-y-5">
          <p>{submission.savedInitials} — Recorded</p>
          <button onClick={onViewLeaderboard} className="bg-gold text-black px-8 py-3">View leaderboard</button>
        </div> : <InitialsForm submission={submission} />}
        <button onClick={onViewScore} className="mt-6 text-gray-200 underline">{submission.status === 'saved' ? 'Back to score' : submission.status === 'saving' ? 'Close while saving' : 'Skip saving'}</button>
      </section>
    </div>
  </ModalSurface>;
}
