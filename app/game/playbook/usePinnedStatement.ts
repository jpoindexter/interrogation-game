import { useRef, useState } from 'react';
import type { PublicStatement } from '@/lib/gameplay/client';
import type { EvidenceWorkbenchProps } from './types';

export function usePinnedStatement(props: EvidenceWorkbenchProps) {
  const [selection, setSelection] = useState('');
  const [localPin, setLocalPin] = useState<PublicStatement | null>(null);
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const projection = props.publicProjection;
  const source = projection.turns.find(turn => turn.id === selection) ?? projection.turns.at(-1);
  const persisted = projection.statements.find(statement => statement.id === props.pinnedStatementId) ?? null;
  const pinned = removed ? null : localPin ?? persisted;
  const pin = async () => {
    if (!source || inFlight.current || props.disabled || projection.status !== 'active') return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const statement = await props.onPin({ turnId: source.id, quote: source.answer });
      if (statement.turnId !== source.id || statement.quote !== source.answer) throw new Error('Source mismatch');
      setLocalPin(statement);
      setRemoved(false);
    } catch { setError('Could not pin this statement. Your selection is preserved; try again.'); }
    finally { inFlight.current = false; setBusy(false); }
  };
  const unpin = () => { setLocalPin(null); setRemoved(true); props.onUnpin?.(); };
  return { source, setSelection, pinned, pin, unpin, busy, error };
}
