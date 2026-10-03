import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent, type KeyboardEvent } from 'react';
import { centerPanel, constrainPanel, movePanel, type PanelPoint } from './panel-bounds';

function subscribeViewport(update: () => void) {
  window.addEventListener('resize', update);
  window.visualViewport?.addEventListener('resize', update);
  return () => { window.removeEventListener('resize', update); window.visualViewport?.removeEventListener('resize', update); };
}
function viewportSnapshot(): string { return `${window.visualViewport?.width ?? window.innerWidth},${window.visualViewport?.height ?? window.innerHeight}`; }

export function usePanelPosition(pos: PanelPoint | null, onPosition: (point: PanelPoint) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointer: number; start: PanelPoint; origin: PanelPoint } | null>(null);
  const [size, setSize] = useState({ width: 320, height: 300 });
  const viewportValue = useSyncExternalStore(subscribeViewport, viewportSnapshot, () => '1024,768');
  const [width, height] = viewportValue.split(',').map(Number);
  const viewport = { width, height };
  const position = constrainPanel(pos ?? centerPanel(size, viewport), size, viewport);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setSize({ width: element.offsetWidth, height: element.offsetHeight }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointer: event.pointerId, start: { x: event.clientX, y: event.clientY }, origin: position };
  };
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const active = drag.current;
    if (!active || active.pointer !== event.pointerId) return;
    onPosition(constrainPanel({ x: active.origin.x + event.clientX - active.start.x, y: active.origin.y + event.clientY - active.start.y }, size, viewport));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!event.key.startsWith('Arrow')) return;
    event.preventDefault();
    onPosition(constrainPanel(movePanel(position, event.key, event.shiftKey ? 40 : 10), size, viewport));
  };
  const stopDrag = () => { drag.current = null; };
  return { ref, position, viewport, reset: () => onPosition(centerPanel(size, viewport)), handle: {
    onPointerDown, onPointerMove, onPointerUp: stopDrag, onPointerCancel: stopDrag, onLostPointerCapture: stopDrag, onKeyDown,
  } };
}
