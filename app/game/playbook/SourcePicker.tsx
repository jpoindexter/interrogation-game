import type { PublicStatement, RecordedTurn } from '@/lib/gameplay/client';

interface SourcePickerProps {
  turns: RecordedTurn[];
  source?: RecordedTurn;
  pinned: PublicStatement | null;
  disabled: boolean;
  pending: boolean;
  onSelect: (id: string) => void;
  onPin: () => void;
  onUnpin: () => void;
  onSource: (id: string) => void;
}

export default function SourcePicker(props: SourcePickerProps) {
  const { turns, source, pinned, disabled, pending, onSelect, onPin, onUnpin, onSource } = props;
  return (
    <section aria-label="Statement source" className="space-y-3">
      <label className="block text-sm font-bold" htmlFor="playbook-source">Choose a suspect statement</label>
      <select id="playbook-source" value={source?.id ?? ''} onChange={event => onSelect(event.target.value)} disabled={disabled || !turns.length}
        className="w-full rounded-sm border border-stone-500 bg-[#f7f2e7] p-2 text-sm text-stone-950 focus-visible:outline-2 focus-visible:outline-offset-2">
        {!turns.length && <option value="">A statement appears after the suspect speaks</option>}
        {turns.map((turn, index) => <option key={turn.id} value={turn.id}>{sourceLabel(turn, index)}</option>)}
      </select>
      <SelectedSource source={source} />
      <button type="button" disabled={disabled || !source} onClick={onPin}
        className="rounded-sm border border-stone-700 px-3 py-2 text-sm font-bold disabled:opacity-50">
        {pending ? 'Pinning statement…' : 'Pin exact statement'}
      </button>
      {pinned && <div className="space-y-2 border border-amber-900/40 bg-[#eadbaf] p-3">
        <p className="text-xs font-bold uppercase tracking-wider">Pinned statement</p>
        <blockquote className="text-sm leading-relaxed">{pinned.quote}</blockquote>
        <div className="flex gap-4 text-sm">
          <button type="button" onClick={() => onSource(pinned.turnId)} className="underline underline-offset-2">View source turn</button>
          <button type="button" disabled={disabled} onClick={onUnpin} className="underline underline-offset-2 disabled:opacity-50">Unpin</button>
        </div>
      </div>}
    </section>
  );
}

function sourceLabel(turn: RecordedTurn, index: number): string {
  const kind = turn.reviewed ? 'reviewed wording' : 'live wording';
  return `Statement ${index + 1} · ${kind}: ${turn.answer.slice(0, 85)}`;
}

function SelectedSource({ source }: { source?: RecordedTurn }) {
  if (!source) return null;
  return <>
    <blockquote className="border-l-2 border-stone-500 pl-3 text-sm leading-relaxed">{source.answer}</blockquote>
    <p className="text-sm leading-relaxed">{source.reviewed
      ? 'Reviewed wording: this statement can be assessed against an exhibit. Reviewed does not mean truthful.'
      : 'Live wording: this statement has not been reviewed for evidence assessment. You can discuss it, or choose the reviewed opening account to establish progress.'}</p>
  </>;
}
