import FloatingPanel from './panels/FloatingPanel';
import type { PanelPoint } from './panels/panel-bounds';

interface NotesPanelProps {
  show: boolean; notes: string; pos: PanelPoint | null;
  onChange: (value: string) => void; onClose: () => void; onPosChange: (position: PanelPoint) => void;
}
export default function NotesPanel({ show, notes, pos, onChange, onClose, onPosChange }: NotesPanelProps) {
  if (!show) return null;
  return <FloatingPanel title="Detective notes" pos={pos} onPosition={onPosChange} onClose={onClose} paper>
    <label htmlFor="detective-notes" className="sr-only">Your case notes</label>
    <textarea id="detective-notes" value={notes} onChange={event => onChange(event.target.value)} autoFocus
      placeholder="Write your notes here…" className="block min-h-32 w-full resize-y bg-transparent p-4 text-base leading-6 text-stone-950 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-stone-800"
      style={{ height: 312, maxHeight: 'calc(100dvh - 120px)', fontFamily: 'var(--font-handwriting)',
        backgroundImage: 'repeating-linear-gradient(transparent, transparent 23px, #d4c080 23px, #d4c080 24px)' }} />
  </FloatingPanel>;
}
