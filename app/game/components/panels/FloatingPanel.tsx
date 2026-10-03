import { useId, type ReactNode } from 'react';
import ModalSurface from '../../../components/ModalSurface';
import { usePanelPosition } from './usePanelPosition';
import type { PanelPoint } from './panel-bounds';

interface Props {
  title: string;
  pos: PanelPoint | null;
  onPosition: (position: PanelPoint) => void;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  paper?: boolean;
}
export default function FloatingPanel({ title, pos, onPosition, onClose, children, width = 360, paper = false }: Props) {
  const { ref: panelRef, position, viewport, reset, handle } = usePanelPosition(pos, onPosition);
  const hint = useId();
  return <ModalSurface label={title} onClose={onClose}>
    <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
    <div data-surface={paper ? 'paper' : 'dark'} ref={panelRef} className={`fixed flex max-h-[calc(100dvh-16px)] max-w-[calc(100vw-16px)] flex-col overflow-hidden rounded-sm border border-surface shadow-2xl ${paper ? 'bg-[#F5E6A3] text-stone-950' : 'bg-surface-darker text-foreground'}`}
      style={{ left: position.x, top: position.y, width, maxWidth: viewport.width - 16, maxHeight: viewport.height - 16 }}>
      <header className={`flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2 ${paper ? 'border-[#3a5a3a] bg-[#4a6a4a] text-white' : 'border-surface'}`}>
        <button type="button" {...handle} aria-label={`Move ${title}`} aria-describedby={hint}
          className="min-h-11 min-w-11 flex-1 cursor-grab touch-none text-left text-sm font-bold active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-gold">{title}</button>
        <button type="button" onClick={reset} className="min-h-11 px-2 text-xs underline">Reset position</button>
        <button type="button" onClick={onClose} aria-label={`Close ${title}`} className="min-h-11 min-w-11 text-xl">×</button>
        <span id={hint} className="sr-only">Drag to move, or use arrow keys. Hold Shift for larger steps.</span>
      </header>
      <div className="min-h-0 overflow-y-auto overscroll-contain">{children}</div>
    </div>
  </ModalSurface>;
}
