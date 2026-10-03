import { useEffect, useRef } from 'react';
import type { RecordedTurn } from '@/lib/gameplay/client';

export default function SourceTurn({ turn, onClose }: { turn?: RecordedTurn; onClose: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (turn) heading.current?.focus(); }, [turn]);
  if (!turn) return null;
  return (
    <section data-source-turn={turn.id} aria-label="Original source turn" className="space-y-2 border-2 border-stone-700 bg-[#f7f2e7] p-3">
      <h3 ref={heading} tabIndex={-1} className="text-sm font-bold">Original source turn</h3>
      {turn.question && <div><p className="text-xs font-bold uppercase">Detective</p><p className="text-sm">{turn.question}</p></div>}
      <div><p className="text-xs font-bold uppercase">Suspect</p><blockquote className="text-sm leading-relaxed">{turn.answer}</blockquote></div>
      <button type="button" onClick={onClose} className="text-sm underline underline-offset-2">Close source</button>
    </section>
  );
}
