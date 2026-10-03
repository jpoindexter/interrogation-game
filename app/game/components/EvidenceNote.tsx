import type { ClueSource, PublicClue } from '@/lib/clue-contract';
import ClueMarker from './ClueMarker';
import { motion } from '../../components/motion';

export default function EvidenceNote({ clue, number, last, onOpenSource }: {
  clue: PublicClue; number: number; last: boolean; onOpenSource: (source: ClueSource) => void;
}) {
  const record = clue.origin === 'case-record';
  return <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
    className={`py-2 ${last ? '' : 'border-b border-black/10'}`}>
    <div className="flex items-center gap-2 mb-1"><ClueMarker number={number} />
      <p className="text-xs uppercase tracking-wider font-bold text-black/70">{record ? 'Case evidence note' : 'Clue'} #{number}</p>
    </div>
    <p className="text-sm leading-relaxed">{clue.text}</p>
    {record && <p className="mt-2 text-xs text-black/70">Canonical case-file evidence, released during this interview. This may summarize a record; it is not a verbatim source document or a suspect quote.</p>}
    {clue.source ? <button type="button" onClick={() => onOpenSource(clue.source!)} className="mt-2 min-h-11 border border-black/60 px-3 text-sm">
      {record ? 'View accompanying exchange' : 'View source exchange'}</button>
      : <p className="mt-2 text-xs text-black/70">Source exchange unavailable for this saved clue.</p>}
  </motion.div>;
}
