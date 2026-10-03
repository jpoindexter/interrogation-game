import type { PublicExhibit } from './types';

export default function ExhibitPicker({ exhibits, selectedId, disabled, onSelect }: {
  exhibits: PublicExhibit[];
  selectedId: string;
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  const selected = exhibits.find(exhibit => exhibit.id === selectedId);
  return (
    <section aria-label="Disclosed evidence" className="space-y-2">
      <label className="block text-sm font-bold" htmlFor="playbook-exhibit">Attach a disclosed exhibit</label>
      <select id="playbook-exhibit" value={selected?.id ?? ''} disabled={disabled || !exhibits.length}
        onChange={event => onSelect(event.target.value)} className="w-full rounded-sm border border-stone-500 bg-[#f7f2e7] p-2 text-sm">
        <option value="">{exhibits.length ? 'Choose an exhibit' : 'No exhibits disclosed yet'}</option>
        {exhibits.map(exhibit => <option key={exhibit.id} value={exhibit.id}>{exhibit.title}</option>)}
      </select>
      {selected && <article className="border border-stone-400 bg-[#f7f2e7] p-3">
        <p className="text-xs uppercase tracking-wider">{selected.kind}</p>
        <h3 className="text-sm font-bold">{selected.title}</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{selected.text}</p>
      </article>}
    </section>
  );
}
