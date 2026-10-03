'use client';

import { useRef, useState } from 'react';
import { chooseApproach, EMPTY_DRAFT } from './composer';
import { usePinnedStatement } from './usePinnedStatement';
import { useDialogueSubmission } from './useDialogueSubmission';
import SourcePicker from './SourcePicker';
import SourceTurn from './SourceTurn';
import DialogueApproaches from './DialogueApproaches';
import ExhibitPicker from './ExhibitPicker';
import QuestionComposer from './QuestionComposer';
import ChallengeFeedback from './ChallengeFeedback';
import type { EvidenceWorkbenchProps } from './types';
export type { EvidenceWorkbenchProps, PublicGameplayProjection } from './types';

export default function EvidenceWorkbench(props: EvidenceWorkbenchProps) {
  return <WorkbenchSession key={`${props.publicProjection.caseId}:${props.publicProjection.turns[0]?.id ?? 'awaiting-turn'}`} {...props} />;
}

function useWorkbench(props: EvidenceWorkbenchProps) {
  const pin = usePinnedStatement(props);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const sourceTrigger = useRef<HTMLElement | null>(null);
  const action = useDialogueSubmission(props, draft, pin.pinned);
  const locked = Boolean(props.disabled || action.pending || pin.busy || props.publicProjection.status !== 'active');
  const openSource = (turnId: string) => {
    sourceTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSourceId(turnId);
    props.onOpenSource?.(turnId);
  };
  const closeSource = () => { setSourceId(null); sourceTrigger.current?.focus(); };
  return { pin, draft, setDraft, sourceId, closeSource, action, locked, openSource };
}

function WorkbenchSession(props: EvidenceWorkbenchProps) {
  const { publicProjection: projection } = props;
  const model = useWorkbench(props);
  const { pin, action, locked, openSource, sourceId, closeSource } = model;
  return (
    <aside data-surface="paper" aria-label="Evidence workbench" className="space-y-5 bg-[#efe8d5] p-4 text-stone-950">
      <header><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#772323]">Case file</p><h2 className="text-lg font-bold">Put the account to the test</h2></header>
      <p className="text-sm leading-relaxed">Pin what the suspect actually said. Ask for detail or compare it with a disclosed exhibit. Stress is not evidence.</p>
      {projection.status !== 'active' && <p role="status" className="text-sm font-bold">This interrogation has ended. You can still review its sources.</p>}
      <SourcePicker turns={projection.turns} source={pin.source} pinned={pin.pinned} disabled={locked} pending={pin.busy}
        onSelect={pin.setSelection} onPin={() => { void pin.pin(); }} onUnpin={pin.unpin} onSource={openSource} />
      {pin.error && <p role="alert" className="text-sm text-[#772323]">{pin.error}</p>}
      <SourceTurn turn={projection.turns.find(turn => turn.id === sourceId)} onClose={closeSource} />
      <DraftControls model={model} projection={projection} />
      {action.error && <p role="alert" className="text-sm text-[#772323]">{action.error}</p>}
      <ChallengeFeedback result={action.result} projection={projection} pinned={pin.pinned} onSource={openSource} />
    </aside>
  );
}

function DraftControls({ model, projection }: { model: ReturnType<typeof useWorkbench>; projection: EvidenceWorkbenchProps['publicProjection'] }) {
  const { pin, draft, setDraft, action, locked } = model;
  return <>
    <DialogueApproaches selected={draft.kind} disabled={locked || !pin.pinned}
      onChoose={kind => { if (pin.pinned) setDraft(chooseApproach(draft, kind, pin.pinned)); }} />
    {draft.kind === 'present_evidence' && <ExhibitPicker exhibits={projection.exhibits} selectedId={draft.exhibitId}
      disabled={locked} onSelect={exhibitId => setDraft({ ...draft, exhibitId })} />}
    <QuestionComposer draft={draft} disabled={locked || !pin.pinned} pending={action.pending}
      onChange={question => setDraft({ ...draft, question })} onSubmit={action.submit} onCancel={() => setDraft(EMPTY_DRAFT)} />
  </>;
}
