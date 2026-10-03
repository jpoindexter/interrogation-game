import type { ReactNode } from 'react';

export default function AvatarFrame({ width, height, frame, children }: {
  width: number; height: number; frame: number; children: ReactNode;
}) {
  return (
    <div style={{
      width: width + frame * 2,
      height: height + frame * 2,
      padding: frame,
      background: 'linear-gradient(160deg, #C89040 0%, #9A6820 50%, #704810 100%)',
      borderRadius: 2,
      boxShadow: 'inset 0 0 0 1px rgba(255,220,140,0.3), 0 0 0 1px #1A0E04, 0 4px 12px rgba(0,0,0,0.6)',
      flexShrink: 0,
      overflow: 'hidden',
      position: 'relative',
    }}>
      {children}
    </div>
  );
}
