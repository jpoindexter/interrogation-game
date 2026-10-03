'use client';

import AssetImage from '../components/AssetImage';
import { useAvatarAnimation } from './useAvatarAnimation';
import AvatarFrame from './AvatarFrame';

import { portraitPath } from '@/lib/art/portraits';

const SIZES = {
  sm: { w: 120, h: 120, frame: 3 },
  md: { w: 256, h: 256, frame: 4 },
  lg: { w: 400, h: 400, frame: 6 },
} as const;

interface SuspectAvatarProps {
  name: string;
  portraitId?: string;
  stressLevel: number;
  size?: 'sm' | 'md' | 'lg';
  speaking?: boolean;
}

export default function SuspectAvatarPixi({ name, portraitId, stressLevel, size = 'lg', speaking = false }: SuspectAvatarProps) {
  const { w, h, frame } = SIZES[size];
  const src = portraitPath(portraitId);

  const { canvasRef, imgRef } = useAvatarAnimation({
    width: w, height: h, scale: size === 'sm' ? 0.5 : size === 'md' ? 0.75 : 1,
    stress: stressLevel, speaking,
  });

  return (
    <AvatarFrame width={w} height={h} frame={frame}>
      <AssetImage
        ref={imgRef}
        src={src}
        alt={name}
        width={w}
        height={h}
        style={{
          display: 'block',
          imageRendering: 'pixelated',
          objectFit: 'cover',
          width: w,
          height: h,
          willChange: 'transform',
        }}
      />
      <canvas
        ref={canvasRef}
        width={w}
        height={h}
        style={{
          position: 'absolute',
          top: frame,
          left: frame,
          width: w,
          height: h,
          pointerEvents: 'none',
        }}
      />
    </AvatarFrame>
  );
}
