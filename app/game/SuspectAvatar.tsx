'use client';

import dynamic from 'next/dynamic';

const PixiAvatar = dynamic(() => import('./SuspectAvatarPixi'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '412px',
        height: '412px',
        background: 'linear-gradient(160deg, #C89040 0%, #9A6820 50%, #704810 100%)',
        borderRadius: '2px',
        boxShadow: `
          inset 0 0 0 1px rgba(255,220,140,0.3),
          0 0 0 1px #1A0E04,
          0 4px 12px rgba(0,0,0,0.6)
        `,
      }}
    />
  ),
});

interface SuspectAvatarProps {
  name: string;
  gender?: string;
  stressLevel: number;
  size?: 'sm' | 'md' | 'lg';
  speaking?: boolean;
}

export default function SuspectAvatar(props: SuspectAvatarProps) {
  return <PixiAvatar {...props} />;
}
