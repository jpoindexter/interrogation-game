import { useEffect, useRef } from 'react';
import type { ClueSource as Source } from '@/lib/clue-contract';

export function clueReference(source: Source): string {
  const excerpt = source.answer.slice(0, 240);
  return `You said, “${excerpt}${source.answer.length > excerpt.length ? '…' : ''}” Can you explain that?`;
}

export default function ClueSource({ source, draft, onReference, onBack }: {
  source: Source; draft: string; onReference: (text: string) => void; onBack: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [source.turnId]);
  const reference = clueReference(source);
  const fits = draft.length + reference.length + (draft ? 2 : 0) <= 500;
  return <section aria-label="Clue source exchange" className="m-4 border-2 border-black/60 p-3 bg-[#f4e8c9]">
    <h2 tabIndex={-1} ref={heading} className="text-sm font-bold uppercase">Clue source · transcript entry {source.messageIndex + 1}</h2>
    <p className="mt-2 text-xs font-bold">Detective</p><p className="text-sm whitespace-pre-wrap">{source.question}</p>
    <p className="mt-2 text-xs font-bold">Subject</p><blockquote className="text-sm whitespace-pre-wrap">{source.answer}</blockquote>
    <p className="mt-3 text-xs">This exchange accompanied the release of the note. The suspect’s words are not the source of a case record or independent proof.</p>
    <p className="mt-2 text-xs">Add {source.answer.length > 240 ? 'a quoted excerpt' : 'this quote'} to your question draft. Nothing is sent.</p>
    <div className="mt-2 flex flex-wrap gap-2">
      <button type="button" disabled={!fits} onClick={() => onReference(reference)} className="min-h-11 border border-black/60 px-3 text-sm disabled:opacity-50">Add quote to question</button>
      <button type="button" onClick={onBack} className="min-h-11 border border-black/60 px-3 text-sm">Back to clues</button>
    </div>
    {!fits && <p className="mt-2 text-xs">Your draft is preserved. Shorten it before adding this quote (500 characters maximum).</p>}
  </section>;
}
