import { DIALOGUE_OPTIONS, type DialogueKind } from '@/lib/gameplay/client';

export default function DialogueApproaches({ selected, disabled, onChoose }: {
  selected: DialogueKind;
  disabled: boolean;
  onChoose: (kind: DialogueKind) => void;
}) {
  return (
    <fieldset disabled={disabled} className="space-y-2">
      <legend className="text-sm font-bold">Prepare a question</legend>
      <p className="text-sm">Choose how to ask. Switching approaches keeps your draft; use a starter below to replace it.</p>
      <div className="grid gap-2">
        {DIALOGUE_OPTIONS.map(option => <button key={option.kind} type="button" aria-pressed={selected === option.kind}
          onClick={() => onChoose(option.kind)} className={`rounded-sm border p-3 text-left disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 ${selected === option.kind ? 'border-stone-800 bg-[#e5d4a7]' : 'border-stone-400 bg-[#f7f2e7]'}`}>
          <span className="block text-sm font-bold">{option.label}</span>
          <span className="block text-sm">{option.description}</span>
        </button>)}
      </div>
    </fieldset>
  );
}
