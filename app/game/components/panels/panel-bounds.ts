export interface PanelPoint { x: number; y: number }
export interface PanelSize { width: number; height: number }
export function constrainPanel(position: PanelPoint, panel: PanelSize, viewport: PanelSize): PanelPoint {
  const margin = 8;
  return {
    x: Math.max(margin, Math.min(position.x, Math.max(margin, viewport.width - panel.width - margin))),
    y: Math.max(margin, Math.min(position.y, Math.max(margin, viewport.height - panel.height - margin))),
  };
}
export function centerPanel(panel: PanelSize, viewport: PanelSize): PanelPoint {
  return constrainPanel({ x: (viewport.width - panel.width) / 2, y: (viewport.height - panel.height) / 2 }, panel, viewport);
}
export function movePanel(position: PanelPoint, key: string, step: number): PanelPoint {
  const direction: Record<string, PanelPoint> = { ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 }, ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step } };
  const delta = direction[key] ?? { x: 0, y: 0 };
  return { x: position.x + delta.x, y: position.y + delta.y };
}
